export async function getCurrentUser() {
    try {
        const response = await fetch("/api/current_user/", {
            method: "GET",
            credentials: "include",
        });
        if (!response.ok) throw new Error("Not logged in");
        return await response.json(); // { username, role }
    } catch {
        return null;
    }
}
