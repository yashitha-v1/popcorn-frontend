export function getUsers() {
    return JSON.parse(localStorage.getItem("users")) || [];
}

export function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
}

export function setCurrentUser(user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
}

export function getCurrentUser() {
    return JSON.parse(localStorage.getItem("currentUser"));
}

export function logoutUser() {
    localStorage.removeItem("currentUser");
}
