import { getUsers, saveUsers } from "./authStorage.js";

document.getElementById("signupForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const users = getUsers();

    const alreadyExists = users.find(user => user.email === email);
    if (alreadyExists) {
        alert("User already exists");
        return;
    }

    users.push({ name, email, password });
    saveUsers(users);

    alert("Signup successful!");
    window.location.href = "login.html";
});
