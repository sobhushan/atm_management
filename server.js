const mysql = require('mysql2');
const express = require('express');
const app = express();
const port = 5500;
const cors = require('cors');
app.use(cors());


// Setup middleware to parse incoming JSON
app.use(express.json());

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', //use your password
    database: 'atm_database',
});

// Test MySQL connection
connection.connect((error) => {
    if (error) {
        console.error('Error connecting to MySQL database:', error);
    } else {
        console.log('Connected to MySQL database!');
    }
});

// Handle Signup request
app.post('/signup', (req, res) => {
    const { username, password, initial_amt } = req.body;

    console.log("Received Signup Data:");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("Initial Amount:", initial_amt);

    const sql = "INSERT INTO users (username, password, initial_amt, current_amt) VALUES (?, ?, ?, ?)";
    connection.query(sql, [username, password, initial_amt, initial_amt], (error, results) => {
        if (error) {
            res.status(500).send("Error inserting data");
            console.log("Error enter")
        } else {
            res.send("Account created successfully!");
        }
    });
});

// Handle Login request
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  console.log("\nLogin attempt with:", username, password); // Debugging input

  if (!username || !password) {
      console.error("Missing username or password");
      return res.status(400).send("Missing username or password");
  }

  const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
  connection.query(sql, [username, password], (error, results) => {
      if (error) {
          console.error("Database error:", error);
          return res.status(500).send("Error verifying user");
      } else if (results.length > 0) {
          console.log("Login successful for:", username);
          res.send("Login successful! Welcome, " + username);
      } else {
          console.log("Invalid credentials for:", username);
          res.status(401).send("Invalid credentials. Please try again.");
      }
  });
});

// Handle Withdraw request
app.post('/withdraw', (req, res) => {
    const { username, amount } = req.body;

    if (!username || !amount) {
        return res.status(400).send("Invalid request: Missing username or amount");
    }

    // Get current balance
    const checkBalanceQuery = "SELECT id, username, current_amt FROM users WHERE username = ?";
    connection.query(checkBalanceQuery, [username], (error, results) => {
        if (error) {
            console.error("Database error:", error);
            return res.status(500).send("Database error");
        }
        if (results.length === 0) {
            return res.status(404).send("User not found");
        }

        const user = results[0];
        if (user.current_amt < amount) {
            return res.status(400).send("Insufficient funds");
        }

        // Update balance after withdrawal
        const newBalance = user.current_amt - amount;
        const updateBalanceQuery = "UPDATE users SET current_amt = ? WHERE id = ?";
        connection.query(updateBalanceQuery, [newBalance, user.id], (error) => {
            if (error) {
                console.error("Database error:", error);
                return res.status(500).send("Failed to process withdrawal");
            }

            // Log the transaction
            const transactionQuery = "INSERT INTO transactions (user_id, username, action_type, amount) VALUES (?, ?, ?, ?)";
            connection.query(transactionQuery, [user.id, user.username, "w", amount], (error) => {
                if (error) {
                    console.error("Error logging transaction:", error);
                    return res.status(500).send("Failed to log transaction");
                }

                res.send(`Withdrawal successful! New balance: ${newBalance}`);
            });
        });
    });
});



// Handle Deposit request
app.post('/deposit', (req, res) => {
    const { username, amount } = req.body;

    if (!username || !amount) {
        return res.status(400).send("Invalid request: Missing username or amount");
    }

    // Get current balance
    const checkBalanceQuery = "SELECT id, username, current_amt FROM users WHERE username = ?";
    connection.query(checkBalanceQuery, [username], (error, results) => {
        if (error) {
            console.error("Database error:", error);
            return res.status(500).send("Database error");
        }
        if (results.length === 0) {
            return res.status(404).send("User not found");
        }

        const user = results[0];

        // Update balance after deposit
        const newBalance = user.current_amt + amount;
        const updateBalanceQuery = "UPDATE users SET current_amt = ? WHERE id = ?";
        connection.query(updateBalanceQuery, [newBalance, user.id], (error) => {
            if (error) {
                console.error("Database error:", error);
                return res.status(500).send("Failed to process deposit");
            }

            // Log the transaction
            const transactionQuery = "INSERT INTO transactions (user_id, username, action_type, amount) VALUES (?, ?, ?, ?)";
            connection.query(transactionQuery, [user.id, user.username, "d", amount], (error) => {
                if (error) {
                    console.error("Error logging transaction:", error);
                    return res.status(500).send("Failed to log transaction");
                }

                res.send(`Deposit successful! New balance: ${newBalance}`);
            });
        });
    });
});


// Fetch Current Balance
app.post('/balance', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send("Invalid request: Missing username");
    }

    const checkBalanceQuery = "SELECT current_amt FROM users WHERE username = ?";

    connection.query(checkBalanceQuery, [username], (error, results) => {
        if (error) {
            console.error("Database error:", error);
            return res.status(500).send("Failed to fetch balance");
        }
        if (results.length === 0) {
            return res.status(404).send("User not found");
        }
        res.json({ balance: results[0].current_amt });
    });
});

// Fetch User Data (username and balance)
app.get('/user-data', (req, res) => {
    const { username } = req.query; // Assume username is passed as a query parameter

    if (!username) {
        return res.status(400).send("Missing username in request");
    }

    const sql = "SELECT username, current_amt FROM users WHERE username = ?";
    connection.query(sql, [username], (error, results) => {
        if (error) {
            console.error("Database error:", error);
            return res.status(500).send("Error fetching user data");
        }
        if (results.length === 0) {
            return res.status(404).send("User not found");
        }

        res.json({
            username: results[0].username,
            balance: results[0].current_amt,
        });
    });
});

// Endpoint to fetch transaction history for a specific user
// app.get('/transactions/:username', (req, res) => {
//     const username = req.params.username;

//     const sql = `
//         SELECT 
//             t.trans_id, 
//             t.action_type, 
//             t.amount, 
//             u.initial_amt, 
//             u.current_amt, 
//             t.created_at 
//         FROM transactions t
//         INNER JOIN users u ON t.user_id = u.id
//         WHERE t.username = ? 
//         ORDER BY t.created_at DESC
//     `;
//     connection.query(sql, [username], (error, results) => {
//         if (error) {
//             console.error("Error fetching transaction history for user:", username, error);
//             return res.status(500).send("Failed to fetch transaction history");
//         }
        
//         // Transform the results to include initial amount before transaction and current balance after transaction
//         const transactionHistory = results.map((transaction, index, array) => {
//             if (index === 0) {
//                 return {
//                     ...transaction,
//                     initial_amt: transaction.initial_amt, // Initial amount for first transaction
//                     current_amt: transaction.current_amt // Current balance after transaction
//                 };
//             } else {
//                 const previousTransaction = array[index - 1];
//                 let newCurrentAmount = previousTransaction.current_amt;
//                 // Adjust based on action type (Withdraw or Deposit)
//                 if (transaction.action_type === 'w') {
//                     newCurrentAmount -= transaction.amount;
//                 } else if (transaction.action_type === 'd') {
//                     newCurrentAmount += transaction.amount;
//                 }

//                 return {
//                     ...transaction,
//                     initial_amt: previousTransaction.current_amt, // Initial balance before this transaction
//                     current_amt: newCurrentAmount // Current balance after this transaction
//                 };
//             }
//         });

//         res.json(transactionHistory); // Send filtered transaction data as JSON
//     });
// });

// Endpoint to fetch transaction history for a specific user
app.get('/transactions/:username', (req, res) => {
    const username = req.params.username;

    const sql = `
        SELECT trans_id, username, action_type, amount, created_at 
        FROM transactions
        WHERE username = ? 
        ORDER BY created_at DESC
    `;
    connection.query(sql, [username], (error, results) => {
        if (error) {
            console.error("Error fetching transaction history for user:", username, error);
            return res.status(500).send("Failed to fetch transaction history");
        }
        res.json(results); // Send filtered transaction data as JSON
    });
});




// Start the server
app.listen(port, () => {
    console.log("Server is running at http://localhost: "+ port);
});
