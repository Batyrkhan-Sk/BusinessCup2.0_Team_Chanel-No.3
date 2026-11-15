"use client";

import { useEffect, useState } from "react";
import { store } from "./store";

/** Guardian membership as recorded in this browser after a verified checkout. `null` while it is being read. */
export function useGuardianMember(): boolean | null {
  const [member, setMember] = useState<boolean | null>(null);
  useEffect(() => setMember(Boolean(store.getGuardian()?.active)), []);
  return member;
}
