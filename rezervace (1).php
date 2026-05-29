<?php
error_reporting(0);
header('Content-Type: application/json');

$db_host = 'sql301.infinityfree.com'; 
$db_name = 'if0_41961871_kino_db'; 
$db_user = 'if0_41961871'; 
$db_pass = 'Tonymatoni420'; 

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Chyba DB: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);

switch($action) {
    case 'login':
        try {
            $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->execute([$data['email']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && password_verify($data['password'], $user['password'])) {
                echo json_encode(['success' => true, 'user' => ['email' => $user['email'], 'role' => $user['role']]]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Špatný e-mail nebo heslo']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Chyba dotazu: ' . $e->getMessage()]);
        }
        break;

    case 'register':
        try {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$data['email']]);
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Tento e-mail je již zaregistrovaný']);
                exit;
            }
            
            $hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (email, password) VALUES (?, ?)");
            if ($stmt->execute([$data['email'], $hashed_password])) {
                echo json_encode(['success' => true, 'user' => ['email' => $data['email'], 'role' => 'user']]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Nastala chyba při zápisu.']);
            }
        } catch (Exception $e) {
             echo json_encode(['success' => false, 'message' => 'Chyba dotazu: ' . $e->getMessage()]);
        }
        break;

    case 'add_movie':
        try {
            $stmt = $pdo->prepare("INSERT INTO movies (title, format, image_url, description, hall) VALUES (?, ?, ?, ?, ?)");
            if ($stmt->execute([$data['title'], $data['format'], $data['image_url'], $data['description'], $data['hall']])) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Film se nepodařilo uložit.']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Chyba dotazu: ' . $e->getMessage()]);
        }
        break;

    // úprava filmu
    case 'edit_movie':
        try {
            $stmt = $pdo->prepare("UPDATE movies SET title = ?, format = ?, image_url = ?, description = ?, hall = ? WHERE id = ?");
            if ($stmt->execute([$data['title'], $data['format'], $data['image_url'], $data['description'], $data['hall'], $data['id']])) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Nepodařilo se upravit film.']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Chyba dotazu: ' . $e->getMessage()]);
        }
        break;

    case 'get_movies':
        try {
            $stmt = $pdo->query("SELECT * FROM movies ORDER BY id DESC");
            $movies = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($movies);
        } catch (Exception $e) {
            echo json_encode([]); 
        }
        break;

    case 'delete_movie':
        try {
            // POJISTKA: Nejdřív smažeme rezervace vázané na tento film, aby to neshodilo databázi
            $stmt2 = $pdo->prepare("DELETE FROM reservations WHERE movie_id = ?");
            $stmt2->execute([$data['id']]);

            // Pak bezpečně smažeme samotný film
            $stmt = $pdo->prepare("DELETE FROM movies WHERE id = ?");
            if ($stmt->execute([$data['id']])) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Nepodařilo se smazat film.']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Chyba dotazu: ' . $e->getMessage()]);
        }
        break;

    case 'make_reservation':
        try {
            $seats_text = implode(',', $data['seats']);
            $stmt = $pdo->prepare("INSERT INTO reservations (email, movie_id, seats) VALUES (?, ?, ?)");
            if ($stmt->execute([$data['email'], $data['movie_id'], $seats_text])) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Nepodařilo se uložit rezervaci.']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Chyba dotazu: ' . $e->getMessage()]);
        }
        break;
}
?>