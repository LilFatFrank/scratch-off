"use client";
import { AppContext } from "../app/context";
import { FC, useContext } from "react";

const Wrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state] = useContext(AppContext);

  return (
    <div
      className="h-[100dvh] transition-all ease-in-out duration-300"
      style={{ background: state.appBackground }}
    >
      <div className="h-full max-w-[400px] flex flex-col items-center p-4 mx-auto">
        {children}
      </div>
    </div>
  );
};

export default Wrapper;
