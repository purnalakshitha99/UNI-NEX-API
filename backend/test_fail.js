const runTest = async () => {
    try {
        const res = await fetch('http://localhost:5000/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: "Fail",
                lastName: "User",
                phone: "123-456-7890", // Failing regex \d{10}
                email: "fail@example.com",
                password: "password123",
                confirmPassword: "password123",
                role: "student",
                studentId: "FAIL001"
            })
        });
        const data = await res.json();
        console.log("STATUS:", res.status);
        console.log("RESPONSE:", data);
    } catch (err) {
        console.error("ERROR:", err.message);
    }
};

runTest();
