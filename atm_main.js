const mysql = require('mysql2');
const prompt = require('prompt-sync')();

// Create a new MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'somy@B2002',
  database: 'atm_database',
});

// Connect to the MySQL database
connection.connect((error) => {
  if (error) {
    console.error('Error connecting to MySQL database:', error);
  } else {
    console.log('Connected to MySQL database!');
    main_fun();
  }
});

function atmprocess(user) {
    //for balance update 
    const getb = "SELECT current_amt FROM users WHERE id = ?";
    connection.query(getb, [user.id], (error, results) => {
        if (error) {
            console.error("Error fetching balance:", error.message);
            return;
        }

        // Update user's current amount
        user.current_amt = results[0].current_amt;

        console.log("Do your Transaction, " + user.username + "!");
        console.log("\nPress:\n'w' for Withdraw\n'd' for Deposit\n'e' for Exit");
        console.log("\nCurrent Amount =", user.current_amt);

        let action = prompt("Choose your action (w/d/e): ");

        // Withdraw function
        if (action === "w") {
            let val = Number(prompt("Enter amount to withdraw: "));
            if (val > user.current_amt) {
                console.log("Insufficient Balance! Try again.");
                atmprocess(user);
            } else {
                user.current_amt -= val;
                console.log("Withdrawal Complete!");

                // Update the user's balance in the database
                const updateQuery = "UPDATE users SET current_amt = ? WHERE id = ?";
                connection.query(updateQuery, [user.current_amt, user.id], (error) => {
                    if (error) {
                        console.error("Error updating balance:", error.message);
                    } else {
                        console.log("Your new balance is:", user.current_amt);

                        // Log the transaction
                        const transactionQuery = "INSERT INTO transactions (user_id, username, action_type, amount) VALUES (?, ?, ?, ?)";
                        connection.query(transactionQuery, [user.id, user.username, action, val], (error) => {
                            if (error) {
                                console.error("Error updating transaction table:", error.message);
                            } else {
                                console.log("\nTransaction Updated Successfully!\n");
                                atmprocess(user);
                            }
                        });
                    }
                });
            }

        // Deposit function
        } else if (action === "d") {
            let val = Number(prompt("Enter amount to deposit: "));
            user.current_amt += val;
            console.log("Deposit Complete!");

            // Update the user's balance in the database
            const updateQuery = "UPDATE users SET current_amt = ? WHERE id = ?";
            connection.query(updateQuery, [user.current_amt, user.id], (error) => {
                if (error) {
                    console.error("Error updating balance:", error.message);
                } else {
                    console.log("Your new balance is:", user.current_amt);

                    // Log the transaction
                    const transactionQuery = "INSERT INTO transactions (user_id, username, action_type, amount) VALUES (?, ?, ?, ?)";
                    connection.query(transactionQuery, [user.id, user.username, action, val], (error) => {
                        if (error) {
                            console.error("Error updating transaction table:", error.message);
                        } else {
                            console.log("\nTransaction Updated Successfully!\n");
                            atmprocess(user);
                        }
                    });
                }
            });

        // Exit action
        } else if (action === "e") {
            console.log("exit.");
            connection.end((error) => {
                if (error) {
                    console.error("Error closing connection:", error.message);
                } else {
                    console.log("Connection Closed");
                }
            });
        } else {
            console.log("Invalid Action. Try Again.");
            atmprocess(user);
        }
    });
}

function login_user() {
    console.log("\n -------LOGIN-------");
    let username = prompt("Your ATM username: ");
    let password = prompt("Your ATM password: ");

    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
    connection.query(sql, [username, password], (error, res) => {
        if (error) {
        console.error("Error verifying user:", error.message);
        return;
        }
        else if (res.length > 0) {
        console.log("\nLogin successful! Welcome, " + username + "!");
        atmprocess(res[0]);
        } else {
        console.log("\nInvalid credentials. Please try again.");
        main_fun();
        }
    });
}

function signup(){
    console.log("\n ------ SIGNUP ------")
    console.log("\nPlease provide the required details.");
    let username = prompt("Enter Username: ");
    let password = prompt("Enter Password: ");
    let initial_amt = Number(prompt("Enter Initial Amount: "));
    if (isNaN(initial_amt) || initial_amt <= 0) {
        console.log("Invalid initial amount. Try again.");
        signup();
    }
    const sql = "INSERT INTO users (username, password, initial_amt, current_amt) VALUES (?, ?, ?, ?)";
    connection.query(sql, [username, password, initial_amt, initial_amt], (error, results) => {
        if (error) {
            console.error("Error inserting data:", error.message)
        }
        else {
            console.log("Account created successfully!\n");
            login_user();
        }
    });
}

function main_fun() {
    console.log("\nATM MAIN FUNCTION!\nPRESS 'y' for YES 'n' for NO");
    let useryn = prompt("Are you an existing user? ");
    // Already user logins
    if (useryn === "y") {
        login_user();
    }
    // Not a user case
    else if (useryn === "n") {
        console.log("Not a User.\n'y' for YES 'n' for NO");
        let sigyn = prompt("Create account? ");
        if (sigyn === "y") { // sign up yes
            signup(); 
        } else {
            console.log("Thank You. Bye.");
        }
    } else {
    console.log("Invalid Input. Try Again.");
    main_fun();
    }
}