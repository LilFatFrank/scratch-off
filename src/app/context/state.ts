export interface AppState {
  appBackground: string;
  appColor: string;
}

const initialState: AppState = {
  appBackground: "linear-gradient(to bottom, #090210, #7727DE)",
  appColor: "#7727DE",
};

export default initialState;
