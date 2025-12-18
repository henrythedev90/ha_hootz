import { Presentation } from "@/types";

const API_BASE = "/api/presentations";

export async function getAllPresentations(): Promise<Presentation[]> {
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized - Please sign in");
      }
      throw new Error("Failed to fetch presentations");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching presentations:", error);
    throw error;
  }
}

export async function savePresentation(
  presentation: Presentation
): Promise<Presentation> {
  try {
    const isNew = !presentation.id || presentation.id === "new";
    const url = isNew ? API_BASE : `${API_BASE}/${presentation.id}`;
    const method = isNew ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(presentation),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized - Please sign in");
      }
      throw new Error("Failed to save presentation");
    }

    return await response.json();
  } catch (error) {
    console.error("Error saving presentation:", error);
    throw error;
  }
}

export async function getPresentationById(
  id: string
): Promise<Presentation | null> {
  try {
    const response = await fetch(`${API_BASE}/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      if (response.status === 401) {
        throw new Error("Unauthorized - Please sign in");
      }
      throw new Error("Failed to fetch presentation");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching presentation:", error);
    throw error;
  }
}

export async function deletePresentation(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized - Please sign in");
      }
      throw new Error("Failed to delete presentation");
    }
  } catch (error) {
    console.error("Error deleting presentation:", error);
    throw error;
  }
}
