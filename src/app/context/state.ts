import { User } from "../interface/user";

export interface AppState {
  appBackground: string;
  appColor: string;
  hasProvider: boolean;
  publicKey: string;
  user: User | null;
}

const initialState: AppState = {
  appBackground: "linear-gradient(to bottom, #090210, #7727DE)",
  appColor: "#7727DE",
  hasProvider: false,
  publicKey: "",
  user: null,
};

export default initialState;
