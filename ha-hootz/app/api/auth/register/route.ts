import { NextRequest, NextResponse } from "next/server";
import { getHostCollection, getPresentationsCollection } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const hostsCollection = await getHostCollection();

    // Check if user already exists
    const existingUser = await hostsCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Host already exists" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const now = new Date().toISOString();
    const result = await hostsCollection.insertOne({
      email,
      password: hashedPassword,
      name: name || null,
      createdAt: now,
      updatedAt: now,
    });

    const userId = result.insertedId.toString();

    // Find existing default presentations by title and create ONE copy per title for the new user
    const presentationsCollection = await getPresentationsCollection();
    const defaultPresentationTitles = [
      "FIFA World Cup Trivia",
      "U.S. History Trivia",
      "African American History Trivia",
      "Golden Era Hip Hop Trivia",
      "Basic Science Trivia",
    ];

    try {
      // Check if user already has any of these presentations (shouldn't happen on registration, but safety check)
      const existingUserPresentations = await presentationsCollection
        .find({
          userId,
          title: { $in: defaultPresentationTitles },
        })
        .toArray();

      if (existingUserPresentations.length > 0) {
        console.log(
          `User ${userId} already has ${existingUserPresentations.length} default presentations, skipping creation`,
        );
      } else {
        // Find ONE presentation per title (get the first one found for each title)
        const userPresentations = [];
        for (const title of defaultPresentationTitles) {
          // Find the first presentation with this title (excluding the new user's ID to avoid duplicates)
          const templatePresentation = await presentationsCollection.findOne({
            title,
            userId: { $ne: userId }, // Exclude presentations that might belong to this user
          });

          if (templatePresentation) {
            const { _id, ...presWithoutId } = templatePresentation;
            userPresentations.push({
              ...presWithoutId,
              userId,
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        if (userPresentations.length > 0) {
          await presentationsCollection.insertMany(userPresentations);
          console.log(
            `Created ${userPresentations.length} default presentations for user ${userId}`,
          );
        } else {
          console.warn(
            `No template presentations found with titles: ${defaultPresentationTitles.join(", ")}`,
          );
        }
      }
    } catch (presentationError) {
      // Log error but don't fail registration if presentations can't be created
      console.error("Error creating default presentations:", presentationError);
      // Continue with successful user creation
    }

    return NextResponse.json(
      {
        message: "User created successfully",
        userId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
