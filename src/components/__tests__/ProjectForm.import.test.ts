/// <reference types="node" />
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import ProjectForm from "../ProjectForm";

test("ProjectForm import works", () => {
  console.log("DEBUG ProjectForm in import test:", ProjectForm);
  expect(ProjectForm).toBeDefined();
});
