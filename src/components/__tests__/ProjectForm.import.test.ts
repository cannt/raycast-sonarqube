/// <reference types="node" />

import ProjectForm from "../ProjectForm";

test("ProjectForm import works", () => {
  console.log("DEBUG ProjectForm in import test:", ProjectForm);
  expect(ProjectForm).toBeDefined();
});
