import { Presentation } from "@/types";

const API_BASE = "/api/presentations";

export async function getAllPresentations(): Promise<Presentation[]> {
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized - Please sign in");
      }

      // Try to extract error message from response
      let errorMessage = "Failed to fetch presentations";
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If response is not JSON, use default message
      }

      throw new Error(errorMessage);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching presentations:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch presentations");
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

      // Try to extract error message from response
      let errorMessage = "Failed to save presentation";
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If response is not JSON, use default message
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("Error saving presentation:", error);
    // Re-throw the error, preserving the message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to save presentation");
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

      // Try to extract error message from response
      let errorMessage = "Failed to fetch presentation";
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If response is not JSON, use default message
      }

      throw new Error(errorMessage);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching presentation:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch presentation");
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

      // Try to extract error message from response
      let errorMessage = "Failed to delete presentation";
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If response is not JSON, use default message
      }

      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("Error deleting presentation:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to delete presentation");
  }
}
