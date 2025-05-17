import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import type { Project } from "./utils";
import { __ } from "./i18n";

export interface ProjectFormProps {
  project?: Project; // Optional project for editing
  onSubmit: (values: { name: string; path: string }) => void;
}

/**
 * Form component for adding or editing a project
 */
export function ProjectForm({ project, onSubmit }: ProjectFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState<string>(project?.name || "");
  const [path, setPath] = useState<string>(project?.path || "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [pathError, setPathError] = useState<string | undefined>();

  /**
   * Validate form inputs and submit if valid
   */
  function validateAndSubmit() {
    let valid = true;
    if (!name || name.trim() === "") {
      setNameError(__("projects.form.nameRequired"));
      valid = false;
    } else {
      setNameError(undefined);
    }
    if (!path || path.trim() === "") {
      setPathError(__("projects.form.pathRequired"));
      valid = false;
    } else {
      setPathError(undefined);
    }
    if (valid) {
      onSubmit({ name, path });
      pop();
    }
  }

  return (
    <Form
      navigationTitle={project ? __("projects.form.editProject") : __("projects.form.addProject")}
      actions={
        <ActionPanel>
          <Action.SubmitForm 
            title={project ? __("common.save") : __("common.add")} 
            onSubmit={validateAndSubmit} 
          />
          <Action 
            title={__("common.cancel")} 
            shortcut={{ modifiers: ["cmd"], key: "." }} 
            onAction={pop} 
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={__("projects.form.name")}
        placeholder={__("projects.form.namePlaceholder")}
        error={nameError}
        value={name}
        onChange={setName}
      />
      <Form.TextField
        id="path"
        title={__("projects.form.path")}
        placeholder={__("projects.form.pathPlaceholder")}
        info={__("projects.form.pathPlaceholder")}
        error={pathError}
        value={path}
        onChange={setPath}
      />
    </Form>
  );
}

export default ProjectForm;
