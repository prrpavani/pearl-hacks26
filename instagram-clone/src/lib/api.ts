const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface Task {
  task_id: string;
  image_url: string;
  options: string[];
  ground_truth?: string; // only for labeling tasks (Earn flow)
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

/** Fetch next labeling task: image from DB + options from Gemini 2.5 Flash (absolute image URL). */
export const getLabelingTask = async (
  tenantName: string = "Instagram"
): Promise<Task> => {
  const res = await fetch(
    `${API}/label/next-task?tenant_name=${encodeURIComponent(tenantName)}`
  );
  if (!res.ok) {
    if (res.status === 404) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail ?? "No more images to label");
    }
    const err = await res.text();
    throw new Error(`label/next-task failed: ${err}`);
  }
  return res.json();
};

/** Submit label for the labeling workflow (vote + SOL payout). */
export const submitLabel = async (
  tenantName: string,
  imageUrl: string,
  label: string,
  walletAddress: string
): Promise<SubmitResult> => {
  const form = new FormData();
  form.append("tenant_name", tenantName);
  form.append("image_url", imageUrl);
  form.append("label", label);
  form.append("wallet_address", walletAddress);
  const res = await fetch(`${API}/label/submit`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`label/submit failed: ${err}`);
  }
  const data = await res.json();
  return {
    success: true,
    is_correct: false, // set by caller using ground_truth
    payout_sol: data.payout_sol ?? 0,
    tx_signature: data.tx_signature ?? null,
    message: "Label submitted!",
  };
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
