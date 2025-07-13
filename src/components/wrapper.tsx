"use client";
import { AppContext } from "../app/context";
import { FC, useContext } from "react";

const Wrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state] = useContext(AppContext);

  return (
    <div className="min-h-[100dvh] transition-all ease-in-out duration-300 flex flex-col items-center justify-center max-lg:p-4" style={{ background: state.appBackground }}>
      {children}
    </div>
  );
};

export default Wrapper;
