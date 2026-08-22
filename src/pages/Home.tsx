import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonList,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "../lib/api.ts";
import { queryKeys } from "../lib/query.ts";

export default function Home() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const itemsQuery = useQuery({
    queryKey: queryKeys.items,
    queryFn: async () => {
      const res = await api.items.$get();
      if (!res.ok) throw new Error("Failed to load items");
      const { items } = await res.json();
      return items;
    },
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.items });
  };

  const createItem = useMutation({
    mutationFn: async (newTitle: string) => {
      const res = await api.items.$post({ json: { title: newTitle } });
      if (!res.ok) throw new Error("Failed to create item");
      return res.json();
    },
    onSuccess: async () => {
      setTitle("");
      await invalidate();
    },
  });

  const toggleItem = useMutation({
    mutationFn: async (vars: { id: string; done: boolean }) => {
      const res = await api.items[":id"].$patch({
        param: { id: vars.id },
        json: { done: vars.done },
      });
      if (!res.ok) throw new Error("Failed to update item");
      return res.json();
    },
    onSuccess: invalidate,
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.items[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("Failed to delete item");
    },
    onSuccess: invalidate,
  });

  const trimmed = title.trim();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Nirvana</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Nirvana</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonItem>
          <IonInput
            label="New item"
            labelPlacement="floating"
            value={title}
            onIonInput={(event) => {
              setTitle(event.detail.value ?? "");
            }}
          />
          <IonButton
            slot="end"
            disabled={trimmed.length === 0 || createItem.isPending}
            onClick={() => {
              createItem.mutate(trimmed);
            }}
          >
            Add
          </IonButton>
        </IonItem>

        {itemsQuery.isPending ? (
          <IonSpinner className="ion-margin" />
        ) : itemsQuery.isError ? (
          <IonItem color="danger">
            <IonInput readonly value={itemsQuery.error.message} />
          </IonItem>
        ) : (
          <IonList>
            {itemsQuery.data.map((item) => (
              <IonItemSliding key={item.id}>
                <IonItem>
                  <IonCheckbox
                    checked={item.done}
                    onIonChange={(event) => {
                      toggleItem.mutate({
                        id: item.id,
                        done: event.detail.checked,
                      });
                    }}
                  >
                    {item.title}
                  </IonCheckbox>
                </IonItem>
                <IonItemOptions slot="end">
                  <IonItemOption
                    color="danger"
                    onClick={() => {
                      deleteItem.mutate(item.id);
                    }}
                  >
                    Delete
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
}
