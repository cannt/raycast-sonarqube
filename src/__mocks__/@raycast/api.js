const React = require("react");

const Form = Object.assign(({ children, actions, ...props }) => React.createElement("form", props, actions, children), {
  TextField: ({ id, value, onChange, ...rest }) =>
    React.createElement("input", {
      "data-testid": id,
      value,
      onChange: (e) => onChange && onChange(e.target.value),
      ...rest,
    }),
  SubmitForm: ({ title, onSubmit }) => React.createElement("button", { type: "submit", onClick: onSubmit }, title),
});
const Action = Object.assign(({ title, children, ...props }) => React.createElement("button", props, title, children), {
  Style: { Destructive: { color: "red" } },
});
const ActionPanel = Object.assign(({ children, ...props }) => React.createElement("div", props, children), {
  Section: ({ children, ...props }) => React.createElement("section", props, children),
});
const List = Object.assign(({ children, actions, ...props }) => React.createElement("div", props, actions, children), {
  Item: ({ title, subtitle, actions, children, ...props }) =>
    React.createElement(
      "div",
      null,
      React.createElement("span", null, title),
      React.createElement("span", null, subtitle),
      actions,
      children,
    ),
  EmptyView: ({ title, description, actions, children, ...props }) =>
    React.createElement(
      "div",
      null,
      React.createElement("span", null, title),
      React.createElement("span", null, description),
      actions,
      children,
    ),
});

module.exports = {
  useNavigation: () => ({ push: jest.fn(), pop: jest.fn() }),
  getPreferenceValues: jest.fn(() => ({})),
  Form,
  List,
  ActionPanel,
  Action,
  Icon: {},
  Keyboard: { Shortcut: { Common: { Edit: "edit", New: "n", Remove: "backspace" } } },
  confirmAlert: jest.fn(() => Promise.resolve(true)),
  showToast: jest.fn().mockResolvedValue({ style: "", title: "", message: "" }),
  Toast: { Style: { Animated: "Animated", Success: "Success", Failure: "Failure" } },
  openExtensionPreferences: jest.fn(),
  __esModule: true,
};
