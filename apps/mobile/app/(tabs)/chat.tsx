import { PlaceholderScreen } from "../../src/features/placeholder-screen";

export default function ChatTab() {
  return (
    <PlaceholderScreen
      eyebrow=""
      title=""
      description=""
      primaryCardTitle="What this tab will do"
      primaryCardBody="Use the user's annual plan, recent spending context, and profile preferences to answer questions with grounded financial suggestions."
      secondaryLabel="Agent Mode"
      secondaryValue="Context-aware"
      secondaryMeta="Reads plan + analysis context"
      tertiaryLabel="Next Build"
      tertiaryValue="Chat flow"
      tertiaryMeta="Prompt, history, and quick actions"
    />
  );
}
