export interface AppState {
  appBackground: string;
  appColor: string;
  hasProvider: boolean;
  publicKey: string;
}

const initialState: AppState = {
  appBackground: "linear-gradient(to bottom, #090210, #7727DE)",
  appColor: "#7727DE",
  hasProvider: false,
  publicKey: "",
};

export default initialState;
