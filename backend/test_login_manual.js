const runTest = async () => {
    try {
        const res = await fetch('http://localhost:5000/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: "test_new@example.com",
                password: "password123"
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
