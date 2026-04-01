const runTest = async () => {
    try {
        const res = await fetch('http://localhost:5000/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: "Test",
                lastName: "User",
                phone: "1234567890",
                email: "test_new@example.com",
                password: "password123",
                confirmPassword: "password123",
                role: "student",
                studentId: "TEST_ID_" + Date.now()
            })
        });
        const data = await res.json();
        if (res.ok) {
            console.log("SUCCESS:", data);
        } else {
            console.error("FAILURE:", data);
        }
    } catch (err) {
        console.error("ERROR:", err.message);
    }
};

runTest();
