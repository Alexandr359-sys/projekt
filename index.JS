console.log("✅ Soubor index.js byl úspěšně načten!");

let currentUser = null;
let currentMovie = null;
let selectedSeats = [];
let seatsArray = []; 

document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    loadMovies(); 
});

window.showModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'block';
};

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
};

window.goToStep = function(stepId) {
    document.querySelectorAll('.step-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(stepId).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

async function loadMovies() {
    try {
        const res = await fetch('./rezervace.php?action=get_movies');
        const movies = await res.json();
        
        const grid = document.getElementById('movieGrid');
        grid.innerHTML = ''; 

        if (movies.length === 0) {
            grid.innerHTML = '<p style="color: #aaa; text-align: center; width: 100%;">Zatím nebyly přidány žádné filmy.</p>';
            return;
        }

        movies.forEach(movie => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            const safeTitle = movie.title.replace(/'/g, "\\'");
            const hallNum = movie.hall || 1;

            card.innerHTML = `
                <img src="${movie.image_url}" alt="${movie.title}" class="movie-img" onerror="this.src='https://via.placeholder.com/300x450?text=Bez+Obrázku'">
                <div class="movie-info">
                    <h3>${movie.title}</h3>
                    <p>${movie.format} | Sál ${hallNum}</p>
                    <button class="btn-book" onclick="bookMovie(${movie.id}, '${safeTitle}', ${hallNum})">Koupit vstupenku</button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        console.error("❌ Chyba při načítání filmů:", e);
    }
}

window.bookMovie = function(id, title, hall) {
    currentMovie = { id, title, hall };
    selectedSeats = []; 
    seatsArray = [];
    
    document.getElementById('movieTitleDisplay').textContent = title;
    document.getElementById('movieHallDisplay').textContent = "Sál " + hall;
    document.getElementById('seatError').textContent = '';
    
    generateOriginalSeatMap(); 
    goToStep('stepSeats'); 
};

function generateOriginalSeatMap() {
    const map = document.getElementById('seatMap');
    map.innerHTML = ''; 
    map.style.display = 'flex';
    map.style.flexDirection = 'column';
    map.style.alignItems = 'center';
    map.style.overflowX = 'auto';
    map.style.padding = '20px';

    function createRow(rowNum) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '6px';
        row.style.margin = '4px 0';
        
        const leftBlock = document.createElement('div');
        leftBlock.style.display = 'flex'; leftBlock.style.gap = '6px';

        const centerBlock = document.createElement('div');
        centerBlock.style.display = 'flex'; centerBlock.style.gap = '6px';

        const rightBlock = document.createElement('div');
        rightBlock.style.display = 'flex'; rightBlock.style.gap = '6px';

        function addSeatsTo(block, count, prefix) {
            for (let i = 1; i <= count; i++) {
                const seat = document.createElement('div');
                seat.classList.add('seat');
                const seatId = `${prefix}${rowNum}-${i}`;
                seat.title = seatId; 

                if (Math.random() < 0.15) seat.classList.add('reserved');

                seat.onclick = () => toggleSeat(seat, seatId);

                seatsArray.push(seat);
                block.appendChild(seat);
            }
        }

        addSeatsTo(leftBlock, 4, 'L');
        addSeatsTo(centerBlock, 10, 'C');
        addSeatsTo(rightBlock, 4, 'R');

        row.appendChild(leftBlock);
        
        const aisle1 = document.createElement('div'); 
        aisle1.style.width = '30px'; 
        row.appendChild(aisle1);
        
        row.appendChild(centerBlock);
        
        const aisle2 = document.createElement('div'); 
        aisle2.style.width = '30px'; 
        row.appendChild(aisle2);
        
        row.appendChild(rightBlock);

        map.appendChild(row);
    }

    for (let r = 1; r <= 10; r++) {
        createRow(r);
    }
}

function toggleSeat(seatElement, seatId) {
    if(seatElement.classList.contains('reserved')) return; 
    
    if(seatElement.classList.contains('selected')) {
        seatElement.classList.remove('selected');
        selectedSeats = selectedSeats.filter(id => id !== seatId);
    } else {
        seatElement.classList.add('selected');
        selectedSeats.push(seatId);
    }
}

window.proceedToCheckout = function() {
    if (selectedSeats.length === 0) {
        document.getElementById('seatError').textContent = 'Vyberte si alespoň jedno sedadlo.';
        return;
    }
    
    const emailInput = document.getElementById('guestEmail');
    if (currentUser) {
        emailInput.value = currentUser.email; 
        emailInput.disabled = true; 
    } else {
        emailInput.value = '';
        emailInput.disabled = false;
    }

    document.getElementById('seatError').textContent = '';
    goToStep('stepCheckout');
};

window.finalizeBooking = async function() {
    const email = document.getElementById('guestEmail').value;
    const errorMsg = document.getElementById('checkoutError');

    if(!email) {
        errorMsg.textContent = 'Zadejte prosím e-mail.';
        return;
    }

    errorMsg.textContent = 'Zpracovávám rezervaci...';
    errorMsg.style.color = 'white';

    try {
        const res = await fetch('./rezervace.php?action=make_reservation', {
            method: 'POST',
            body: JSON.stringify({
                email: email,
                movie_id: currentMovie.id,
                seats: selectedSeats 
            }),
            headers: {'Content-Type': 'application/json'}
        });
        
        const data = await res.json();
        
        if(data.success) {
            document.getElementById('successMessage').innerHTML = `
                Vaše vstupenky na film <strong>"${currentMovie.title}"</strong><br>
                (Sál <strong>${currentMovie.hall}</strong> | Místa: <strong>${selectedSeats.join(', ')}</strong>)<br><br>
                Potvrzení jsme zaslali na: <strong>${email}</strong>.
            `;
            goToStep('stepSuccess');
        } else {
            errorMsg.style.color = '#e74c3c';
            errorMsg.textContent = data.message;
        }
    } catch (e) {
        errorMsg.style.color = '#e74c3c';
        errorMsg.textContent = 'Chyba při komunikaci se serverem.';
        console.error(e);
    }
};

window.login = async function() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('loginError');
    if(!email || !pass) { errorMsg.textContent = 'Vyplňte e-mail a heslo.'; return; }

    try {
        const res = await fetch('./rezervace.php?action=login', {
            method: 'POST', body: JSON.stringify({email, password: pass}), headers: {'Content-Type': 'application/json'}
        });
        const data = await res.json();
        if(data.success) {
            localStorage.setItem('cinemaUser', JSON.stringify(data.user));
            closeModal('loginModal'); checkLogin();
        } else { errorMsg.textContent = data.message; }
    } catch (e) { errorMsg.textContent = 'Chyba připojení k serveru.'; }
};

window.register = async function() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('loginError');
    if(!email || !pass) { errorMsg.textContent = 'Vyplňte e-mail a heslo pro registraci.'; return; }

    try {
        const res = await fetch('./rezervace.php?action=register', {
            method: 'POST', body: JSON.stringify({email, password: pass}), headers: {'Content-Type': 'application/json'}
        });
        const data = await res.json();
        if(data.success) {
            localStorage.setItem('cinemaUser', JSON.stringify(data.user));
            closeModal('loginModal'); checkLogin();
        } else { errorMsg.textContent = data.message; }
    } catch (e) { errorMsg.textContent = 'Chyba připojení k serveru.'; }
};

function checkLogin() {
    const storedUser = localStorage.getItem('cinemaUser');
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    
    if (!loginBtn || !userMenu) return;

    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        loginBtn.classList.add('hidden');
        userMenu.classList.remove('hidden');
        document.getElementById('userName').textContent = currentUser.email;
        
        const adminLink = document.getElementById('adminLink');
        if (adminLink) {
            if (currentUser.role === 'admin') adminLink.classList.remove('hidden');
            else adminLink.classList.add('hidden');
        }
    } else {
        currentUser = null;
        loginBtn.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
}

window.logout = function() {
    localStorage.removeItem('cinemaUser');
    checkLogin();
    if(window.location.pathname.includes('admin.html')) window.location.href = 'index.html';
};