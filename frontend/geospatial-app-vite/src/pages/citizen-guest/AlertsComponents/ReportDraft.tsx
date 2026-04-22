const DRAFT_KEY = "report_draft";

export function saveDraft(data: any) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
}

export function loadDraft() {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
}

export function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
}