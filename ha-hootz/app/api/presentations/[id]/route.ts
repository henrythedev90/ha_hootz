import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPresentationsCollection } from "@/lib/db";
import { Presentation } from "@/types";
import { ObjectId } from "mongodb";

// GET a single presentation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const presentationsCollection = await getPresentationsCollection();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid presentation ID" },
        { status: 400 }
      );
    }

    const presentation = await presentationsCollection.findOne({
      _id: new ObjectId(id),
      userId: session.user.id,
    });

    if (!presentation) {
      return NextResponse.json(
        { error: "Presentation not found" },
        { status: 404 }
      );
    }

    const { _id, ...rest } = presentation as any;
    return NextResponse.json({
      ...rest,
      id: _id.toString(),
    });
  } catch (error) {
    console.error("Error fetching presentation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT update a presentation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, questions } = body;

    const presentationsCollection = await getPresentationsCollection();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid presentation ID" },
        { status: 400 }
      );
    }

    // Check if presentation exists and belongs to user
    const existing = await presentationsCollection.findOne({
      _id: new ObjectId(id),
      userId: session.user.id,
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Presentation not found" },
        { status: 404 }
      );
    }

    const update: Partial<Presentation> = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (questions !== undefined) update.questions = questions;

    await presentationsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );

    const updated = await presentationsCollection.findOne({
      _id: new ObjectId(id),
    });

    const { _id, ...rest } = updated as any;
    return NextResponse.json({
      ...rest,
      id: _id.toString(),
    });
  } catch (error) {
    console.error("Error updating presentation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE a presentation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const presentationsCollection = await getPresentationsCollection();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid presentation ID" },
        { status: 400 }
      );
    }

    const result = await presentationsCollection.deleteOne({
      _id: new ObjectId(id),
      userId: session.user.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Presentation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Presentation deleted successfully" });
  } catch (error) {
    console.error("Error deleting presentation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
