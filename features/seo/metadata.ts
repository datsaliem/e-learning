import type { Metadata } from "next";

export const PRIVATE_ROBOTS_METADATA: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

export const PRIVATE_ROUTE_METADATA: Metadata = {
  robots: PRIVATE_ROBOTS_METADATA,
};
