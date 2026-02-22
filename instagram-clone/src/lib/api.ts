const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface Task {
  task_id: string;
  image_url: string;
  options: string[];
}

export interface SubmitResult {
  success: boolean;
  is_correct: boolean;
  payout_sol: number;
  tx_signature: string | null;
  message: string;
}

export interface LeaderboardEntry {
  wallet_address: string;
  total_sol: number;
  tasks_completed: number;
}

export const generateTask = async (): Promise<Task> => {
  const res = await fetch(`${API}/generate-task`, { method: "POST" });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`generate-task failed: ${err}`);
  }
  return res.json();
};

export const submitTask = async (
  wallet_address: string,
  task_id: string,
  label: string
): Promise<SubmitResult> => {
  const res = await fetch(`${API}/submit-task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet_address, task_id, label }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`submit-task failed: ${err}`);
  }
  return res.json();
};

export const fetchTipAudio = async (): Promise<{ tipText: string; audioUrl: string }> => {
  const res = await fetch(`${API}/get-tip`);
  if (!res.ok) throw new Error("get-tip failed");
  const tipText = res.headers.get("X-Tip-Text") ?? "";
  const blob = await res.blob();
  const audioUrl = URL.createObjectURL(blob);
  return { tipText, audioUrl };
};

export const fetchLeaderboard = async (limit = 10): Promise<LeaderboardEntry[]> => {
  const res = await fetch(`${API}/leaderboard?limit=${limit}`);
  if (!res.ok) throw new Error("leaderboard failed");
  const data = await res.json();
  return data.leaderboard;
};
