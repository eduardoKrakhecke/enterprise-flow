
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";

import {setGlobalOptions} from "firebase-functions";

initializeApp();

setGlobalOptions({maxInstances: 10});

const db = getFirestore();

export {createTenant} from "./tenants/create-tenant";

export const trackTaskActivity = onDocumentWritten(
  "tasks/{taskId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    // NÃ£o registra exclusÃµes nesta primeira versÃ£o.
    if (!after) return;

    const taskId = event.params.taskId;

    // Evento de criaÃ§Ã£o.
    if (!before) {
      await db.collection("taskActivities").add({
        tenantId: after["tenantId"],
        taskId,
        projectId: after["projectId"],
        type: "created",
        userId: after["createdBy"],
        message: "Tarefa criada",
        previousStatus: null,
        newStatus: after["status"],
        createdAt: FieldValue.serverTimestamp(),
      });

      return;
    }

    // Registra apenas mudanÃ§as reais de status.
    if (before["status"] === after["status"]) return;

    await db.collection("taskActivities").add({
      tenantId: after["tenantId"],
      taskId,
      projectId: after["projectId"],
      type: "status_changed",
      userId: after["createdBy"],
      message: "Status da tarefa alterado",
      previousStatus: before["status"],
      newStatus: after["status"],
      createdAt: FieldValue.serverTimestamp(),
    });
  },
);
