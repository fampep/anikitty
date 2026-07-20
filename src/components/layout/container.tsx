import { cn } from "@/lib/core/utils";
import React, { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  className?: string;
  id?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const Container = ({ children, className, id, ...rest }: Props) => {
  return (
    <div
      id={id}
      className={cn([
        "mx-auto w-full",
        "px-4",
        "md:px-6 lg:px-8",
        "max-w-[1400px] 2xl:max-w-[1600px]",
        className,
      ])}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Container;
