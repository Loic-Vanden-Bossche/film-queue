import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { FolderStat, HealthStatus, Job } from "@/app/lib/types";

type ToastState = {
  message: string;
  tone: "success" | "error" | "info";
} | null;

type QueueEvent = {
  type?: string;
  jobId?: string;
  url?: string;
  bytes?: number;
  totalBytes?: number | null;
  filename?: string;
  error?: string;
  folder?: string | null;
};

export default function useQueueData() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [cancelling, setCancelling] = useState<Set<string>>(() => new Set());
  const [queuePaused, setQueuePaused] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [folders, setFolders] = useState<FolderStat[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const selectedFolderRef = useRef("");
  const [toast, setToast] = useState<ToastState>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [queueUpdating, setQueueUpdating] = useState(false);
  const initialFolderRef = useRef<string | null>(null);

  const pushToast = useCallback(
    (message: string, tone: "success" | "error" | "info") => {
      setToast({ message, tone });
    },
    [],
  );

  const fetchJobs = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch("/api/jobs");
      const data = (await response.json()) as Job[];
      setJobs(data);
      setLastUpdated(Date.now());
    } catch {
      setErrorMessage("Unable to reach the queue server.");
      pushToast("Unable to reach the queue server.", "error");
    } finally {
      setHasLoaded(true);
      setIsRefreshing(false);
    }
  }, [pushToast]);

  const fetchQueueStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/queue");
      const data = (await response.json()) as { paused?: boolean };
      setQueuePaused(Boolean(data.paused));
    } catch {
      setQueuePaused(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/health");
      const data = (await response.json()) as HealthStatus;
      setHealth(data);
      setQueuePaused(Boolean(data.queuePaused));
    } catch {
      setHealth(null);
    }
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetch("/api/folders");
      const data = (await response.json()) as FolderStat[];
      setFolders(data);
      const preferred = initialFolderRef.current;
      if (preferred && data.some((folder) => folder.name === preferred)) {
        selectedFolderRef.current = preferred;
        setSelectedFolder(preferred);
        initialFolderRef.current = null;
        return;
      }
      if (
        data.length > 0 &&
        !data.some((folder) => folder.name === selectedFolderRef.current)
      ) {
        selectedFolderRef.current = data[0].name;
        setSelectedFolder(data[0].name);
      }
    } catch {
      setFolders([]);
    }
  }, []);

  const applyQueueEvent = useCallback((event: QueueEvent) => {
    if (!event.jobId || !event.type) return;
    const now = Date.now();
    setJobs((prev) => {
      const existing = prev.find((job) => job.id === event.jobId);
      const base: Job =
        existing || {
          id: event.jobId,
          url: event.url || "",
          folder: event.folder ?? null,
          status: "waiting",
          createdAt: now,
          startedAt: null,
          finishedAt: null,
          bytes: 0,
          totalBytes: null,
          filename: null,
          error: null,
        };

      const next: Job = { ...base };
      if (event.url) next.url = event.url;
      if (event.folder !== undefined) next.folder = event.folder;

      if (event.type === "started") {
        next.status = "active";
        next.startedAt = base.startedAt ?? now;
        next.finishedAt = null;
      }
      if (event.type === "progress") {
        next.status = "active";
        next.bytes = event.bytes ?? base.bytes;
        if (event.totalBytes !== undefined) next.totalBytes = event.totalBytes;
        next.startedAt = base.startedAt ?? now;
      }
      if (event.type === "metadata") {
        next.status = "active";
        if (event.totalBytes !== undefined) next.totalBytes = event.totalBytes;
        next.startedAt = base.startedAt ?? now;
      }
      if (event.type === "completed") {
        next.status = "completed";
        next.bytes = event.bytes ?? base.bytes;
        if (event.totalBytes !== undefined) next.totalBytes = event.totalBytes;
        if (event.filename) next.filename = event.filename;
        next.finishedAt = now;
      }
      if (event.type === "failed") {
        next.status = "failed";
        next.error = event.error || base.error;
        next.finishedAt = now;
      }
      if (event.type === "cancelled") {
        next.status = "cancelled";
        next.finishedAt = now;
      }

      if (existing) {
        return prev.map((job) => (job.id === event.jobId ? next : job));
      }
      return [next, ...prev];
    });
  }, []);

  useEffect(() => {
    const storedFolder =
      typeof window !== "undefined"
        ? window.localStorage.getItem("filmQueueFolder")
        : null;
    if (storedFolder) {
      initialFolderRef.current = storedFolder;
      selectedFolderRef.current = storedFolder;
      setSelectedFolder(storedFolder);
    }
    fetchJobs();
    fetchQueueStatus();
    fetchHealth();
    fetchFolders();
    const interval = setInterval(fetchJobs, 8000);
    return () => clearInterval(interval);
  }, [fetchFolders, fetchHealth, fetchJobs, fetchQueueStatus]);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onopen = () => setIsConnected(true);
    source.onerror = () => setIsConnected(false);
    source.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data) as QueueEvent;
        if (parsed.type === "ping") return;
        applyQueueEvent(parsed);
      } catch {
        // Ignore malformed events.
      }
    };

    return () => {
      source.close();
    };
  }, [applyQueueEvent]);

  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    selectedFolderRef.current = selectedFolder;
    if (!selectedFolder) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem("filmQueueFolder", selectedFolder);
  }, [selectedFolder]);

  const setSelectedFolderSafe = (value: string) => {
    selectedFolderRef.current = value;
    setSelectedFolder(value);
  };

  useEffect(() => {
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const url = String(formData.get("url") || "").trim();
    const folder = String(formData.get("folder") || "").trim();
    if (!url) return;
    if (!folder) {
      pushToast("Please select a folder.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, folder }),
      });

      if (!response.ok) {
        let message = "Unable to queue the download.";
        try {
          const payload = await response.json();
          message = payload.message || message;
        } catch {
          const text = await response.text();
          if (text) message = text;
        }
        setErrorMessage(message);
        pushToast(message, "error");
        return;
      }

      form.reset();
      await fetchJobs();
      pushToast("Download queued.", "success");
    } catch {
      setErrorMessage("Unable to queue the download.");
      pushToast("Unable to queue the download.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (jobId: string) => {
    if (cancelling.has(jobId)) return;
    setCancelling((prev) => new Set(prev).add(jobId));
    try {
      await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      await fetchJobs();
      pushToast("Download cancelled.", "info");
    } finally {
      setCancelling((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleQueueToggle = async () => {
    const action = queuePaused ? "resume" : "pause";
    try {
      setQueueUpdating(true);
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { paused?: boolean };
        setQueuePaused(Boolean(payload.paused));
        pushToast(payload.paused ? "Queue paused." : "Queue resumed.", "info");
      }
    } catch {
      pushToast("Unable to update queue.", "error");
    } finally {
      setQueueUpdating(false);
    }
  };

  return {
    jobs,
    isSubmitting,
    isConnected,
    errorMessage,
    clock,
    cancelling,
    queuePaused,
    health,
    folders,
    selectedFolder,
    toast,
    isRefreshing,
    hasLoaded,
    lastUpdated,
    queueUpdating,
    setSelectedFolder: setSelectedFolderSafe,
    fetchJobs,
    handleSubmit,
    handleCancel,
    handleQueueToggle,
  };
}
