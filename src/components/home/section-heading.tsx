"use client";

import React from "react";
import { HomeSectionLink } from "@/components/home/home-shared";

/** Shared home section title — delegates to HomeSectionLink for one visual language. */
export const SectionHeading = ({
  icon,
  title,
  href,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  href?: string;
  subtitle?: string;
}) => {
  return <HomeSectionLink href={href} title={title} icon={icon} subtitle={subtitle} />;
};
