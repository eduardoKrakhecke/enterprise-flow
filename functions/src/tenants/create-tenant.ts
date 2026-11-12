
import {onCall, HttpsError} from "firebase-functions/v2/https";

import {initializeApp, getApps} from "firebase-admin/app";

import {
  FieldValue,
  getFirestore,
} from "firebase-admin/firestore";

import {
  getAuth,
} from "firebase-admin/auth";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const normalizeDocument = (value: string): string =>
  value.replace(/\D/g, "");

const normalizeSlug = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const createTenant = onCall(
  {
    region: "southamerica-east1",
    enforceAppCheck: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Você precisa estar autenticado."
      );
    }

    const uid = request.auth.uid;

    const name =
      typeof request.data?.name === "string" ?
        request.data.name.trim() :
        "";

    const document =
      typeof request.data?.document === "string" ?
        normalizeDocument(request.data.document) :
        "";

    if (name.length < 3 || name.length > 100) {
      throw new HttpsError(
        "invalid-argument",
        "O nome deve possuir entre 3 e 100 caracteres."
      );
    }

    if (document.length !== 14) {
      throw new HttpsError(
        "invalid-argument",
        "Informe um CNPJ válido em formato de 14 dígitos."
      );
    }

    const slug = normalizeSlug(name);

    if (!slug) {
      throw new HttpsError(
        "invalid-argument",
        "Não foi possível gerar o identificador da empresa."
      );
    }

    const tenantRef = db.collection("tenants").doc();
    const memberId = `${tenantRef.id}_${uid}`;

    const memberRef = db
      .collection("tenantMembers")
      .doc(memberId);

    const userRef = db
      .collection("users")
      .doc(uid);

    const documentRef = db
      .collection("tenantDocuments")
      .doc(document);

    const authUser = await getAuth().getUser(uid);

    try {
      await db.runTransaction(async (transaction) => {
        const [existingDocument, existingMember] =
          await Promise.all([
            transaction.get(documentRef),
            transaction.get(memberRef),
          ]);

        if (existingDocument.exists) {
          throw new HttpsError(
            "already-exists",
            "Já existe uma empresa cadastrada com este CNPJ."
          );
        }

        if (existingMember.exists) {
          throw new HttpsError(
            "already-exists",
            "A associação desta empresa já existe."
          );
        }

        transaction.create(tenantRef, {
          name,
          document,
          slug,
          ownerId: uid,
          status: "active",
          createdAt: FieldValue.serverTimestamp(),
        });

        transaction.create(memberRef, {
          tenantId: tenantRef.id,
          userId: uid,
          role: "owner",
          active: true,
          createdAt: FieldValue.serverTimestamp(),
        });

        transaction.set(
          userRef,
          {
            name: authUser.displayName ?? "Usuário",
            email: authUser.email ?? "",
            photoURL: authUser.photoURL ?? null,
            active: true,
            createdAt: FieldValue.serverTimestamp(),
          },
          {merge: true}
        );

        transaction.create(documentRef, {
          tenantId: tenantRef.id,
          createdAt: FieldValue.serverTimestamp(),
        });
      });

      return {
        tenantId: tenantRef.id,
        name,
        role: "owner",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Não foi possível criar a organização."
      );
    }
  }
);
