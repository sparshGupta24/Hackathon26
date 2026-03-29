import { NextResponse, type NextRequest } from "next/server";
import { badRequest, serverError } from "@/lib/http";
import { createPerson, deletePerson } from "@/lib/firestore/people";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const nameRaw = formData.get("name");
    const file = formData.get("photo");

    if (typeof nameRaw !== "string" || !nameRaw.trim()) {
      return badRequest("Name is required");
    }

    if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
      return badRequest("Photo file is required");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const person = await createPerson({
      name: nameRaw,
      buffer,
      contentType: file.type,
      fileName: file.name
    });

    return NextResponse.json({ ok: true, person }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_NAME") {
        return badRequest("Enter a valid name (1–80 characters).");
      }
      if (error.message === "INVALID_IMAGE_TYPE") {
        return badRequest("Use a PNG, JPEG, or WebP image.");
      }
      if (error.message === "IMAGE_TOO_LARGE") {
        return badRequest("Image is too large. Use a smaller file.");
      }
      if (error.message === "STORAGE_FAILED_FILE_TOO_LARGE") {
        return badRequest(
          "Firebase Storage could not be used and the image is too large to store on the roster document (max about 720KB without Storage). " +
            "Enable Storage in the Firebase console and ensure the default bucket exists, set FIREBASE_STORAGE_BUCKET in .env if needed, or use a smaller image."
        );
      }
    }
    console.error("Failed to create person", error);
    const hint =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? ` (${error.message})`
        : "";
    return serverError(`Failed to add player${hint}`);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => null)) as { id?: string } | null;
    const id = typeof payload?.id === "string" ? payload.id.trim() : "";
    if (!id) {
      return badRequest("Player id is required");
    }
    await deletePerson(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "PERSON_NOT_FOUND") {
      return badRequest("Player not found");
    }
    console.error("Failed to delete person", error);
    return serverError("Failed to remove player");
  }
}
