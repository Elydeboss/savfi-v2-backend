export type UserAgg = {
  enabled: boolean;
  name: string;
  totalSaved: number /*for saving amount*/;
};

export type UserEvt =
  | { type: "disabled" }
  | { type: "enabled" }
  | { type: "nameChanged"; name: string }
  | { type: "created"; name: string }
  | {
      type: "Savingcreated";
      saving: string;
      name: string;
      Initialsaving: string;
    };

export type UserCmd =
  | { type: "disable" }
  | { type: "enable" }
  | { type: "setName"; name: string }
  | { type: "create"; name: string };
