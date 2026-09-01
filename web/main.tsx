import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Home } from "@/routes/index";
import { HowPage } from "@/routes/how";
import { AndroidPage } from "@/routes/android";
import { ReceivePage } from "@/routes/receive";
import { AppSend } from "@/components/app-send";
import { AppErrorComponent } from "@/lib/error-component";
import "../src/styles.css";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});
const howRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "how",
  component: HowPage,
});
const sendRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "send",
  component: AppSend,
});
const sendShortRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "s",
  component: AppSend,
});
const receiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "receive",
  component: ReceivePage,
});
const receiveShortRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "r",
  component: ReceivePage,
});
const androidRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "android",
  component: AndroidPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  howRoute,
  sendRoute,
  sendShortRoute,
  receiveRoute,
  receiveShortRoute,
  androidRoute,
]);

const basepath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || "/";

const router = createRouter({
  routeTree,
  basepath: basepath === "/" ? undefined : basepath,
  defaultErrorComponent: AppErrorComponent,
  defaultNotFoundComponent: HowPage,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const el = document.getElementById("root");
if (!el) throw new Error("Missing #root");
createRoot(el).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
