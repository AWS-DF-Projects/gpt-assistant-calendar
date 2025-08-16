import AssistantUIMock from "./gpt-assistant-ui";
export default function App() {
  return <AssistantUIMock />;
}
console.log('VITE_API_BASE =', import.meta.env.VITE_API_BASE);
