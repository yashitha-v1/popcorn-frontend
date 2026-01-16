import { getUsers, setCurrentUser } from "./authStorage.js";

document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const users = getUsers();

    const user = users.find(
        (u) => u.email === email && u.password === password
    );

    if (!user) {
        alert("Invalid email or password");
        return;
    }

    setCurrentUser(user);
    alert("Login successful!");
    window.location.href = "index.html";
});
