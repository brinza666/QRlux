import { createFileRoute } from "@tanstack/react-router";
import { AppReceive } from "@/components/app-receive";

export const Route = createFileRoute("/app/receive")({ component: AppReceive });
