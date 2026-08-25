export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("sk-SK") : "—";
