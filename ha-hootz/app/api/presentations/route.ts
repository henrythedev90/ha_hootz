import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPresentationsCollection } from "@/lib/db";
import { Presentation } from "@/types";
import { ObjectId } from "mongodb";

// GET all presentations for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const presentationsCollection = await getPresentationsCollection();
    const presentations = await presentationsCollection
      .find({ userId: session.user.id })
      .toArray();

    // Convert MongoDB _id to id and remove _id
    const formattedPresentations = presentations.map((pres: any) => {
      const { _id, ...rest } = pres;
      return {
        ...rest,
        id: _id.toString(),
      };
    });

    return NextResponse.json(formattedPresentations);
  } catch (error) {
    console.error("Error fetching presentations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create a new presentation
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, questions, scoringConfig } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const presentationsCollection = await getPresentationsCollection();
    const now = new Date().toISOString();

    const presentation: Omit<Presentation, "id"> = {
      userId: session.user.id,
      title,
      description: description || "",
      createdAt: now,
      updatedAt: now,
      questions: questions || [],
      scoringConfig: scoringConfig || undefined,
    };

    const result = await presentationsCollection.insertOne(presentation);

    return NextResponse.json(
      {
        ...presentation,
        id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating presentation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
