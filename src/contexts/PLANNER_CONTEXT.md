# Planner Context Specification

This document outlines the modular structure for the `PlannerContext`, which centralizes the state management for the EduPlan AI application.

## Modular Architecture

The context is divided into three primary modules to ensure separation of concerns and maintainability.

### 1. Inputs Module
Manages the lesson planning parameters.
- **State**:
  - `inputs`: `PlannerInputs` (subject, grade, topic, duration)
- **Actions**:
  - `setInputs`: Updates the input state.
  - `resetInputs`: Clears all inputs.

### 2. Generation Module
Handles the AI interaction and content streaming.
- **State**:
  - `content`: The currently generated markdown content.
  - `loading`: Boolean indicating if a generation is in progress.
  - `chatMessages`: The conversation history for refinement.
- **Actions**:
  - `generateLesson`: Initiates the initial lesson generation.
  - `refineLesson`: Sends a refinement prompt to the AI.
  - `setContent`: Manually update content (e.g., when loading a plan).

### 3. History Module
Manages the persistence of saved plans.
- **State**:
  - `history`: List of `SavedPlan` objects.
  - `activePlanId`: The ID of the plan currently being viewed/edited.
- **Actions**:
  - `savePlan`: Persists the current content and inputs to history.
  - `loadPlan`: Sets the active plan and populates inputs/content.
  - `deletePlan`: Removes a plan from history.

## Implementation Details

### Provider Pattern
The `PlannerProvider` should wrap the application in `App.tsx`.

```tsx
export const PlannerProvider = ({ children }: { children: ReactNode }) => {
  const inputs = useInputsModule();
  const generation = useGenerationModule(inputs);
  const history = useHistoryModule(inputs, generation);

  return (
    <PlannerContext.Provider value={{ ...inputs, ...generation, ...history }}>
      {children}
    </PlannerContext.Provider>
  );
};
```

### Hook Access
Components should access the context via a custom `usePlanner` hook.

```tsx
const { inputs, generateLesson, history } = usePlanner();
```
