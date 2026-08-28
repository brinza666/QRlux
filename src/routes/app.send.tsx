import { createFileRoute } from "@tanstack/react-router";
import { AppSend } from "@/components/app-send";

export const Route = createFileRoute("/app/send")({ component: AppSend });
