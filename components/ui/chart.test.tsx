import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ChartContainer } from "./chart";

it("emits chart colors for the app data-theme dark selector", () => {
  const markup = renderToStaticMarkup(
    <ChartContainer
      id="theme-contract"
      config={{ pageViews: { color: "#0ea5e9" } }}
    >
      <div />
    </ChartContainer>,
  );

  expect(markup).toContain(
    'html[data-theme="dark"] [data-chart=chart-theme-contract]',
  );
  expect(markup).not.toContain(".dark [data-chart=chart-theme-contract]");
});
