document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('player_search_input');
    const playerListContainer = document.getElementById('current_server_players_list');
    const serverPlayers = JSON.parse(document.getElementById('server_players_data').value);

    const playersPerPage = 10;
    let filteredPlayers = [...serverPlayers];

    function renderPlayers(playerList, currentPage = 1) {
        const start = (currentPage - 1) * playersPerPage;
        const end = Math.min(currentPage * playersPerPage, playerList.length);

        // Clear the current list and prepare for the next pagination
        playerListContainer.innerHTML = '';

        // Render the players for the current page
        for (let i = start; i < end; i++) {
            const player = playerList[i];
            const listItem = document.createElement('li');
            listItem.classList.add('current_user_list_item');

            // Create player name link
            const playerContainer = document.createElement('div');
            playerContainer.classList.add('current_user_container');
            const anchor = document.createElement('a');
            anchor.href = `player/${player.user_steam_id}`;
            anchor.textContent = player.user_steam_name;
            playerContainer.appendChild(anchor);

            // Create delete toggle container
            const deleteToggleContainer = document.createElement('div');
            deleteToggleContainer.classList.add('delete_toggle_container');

            const deleteToggle = document.createElement('div');
            deleteToggle.classList.add('current_user_delete_toggle');

            // Create checkbox for player deletion
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'user_ids_checkbox';
            checkbox.value = player.user_steam_id;

            // Create hidden input for the player's name
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'user_names_hidden_input';
            hiddenInput.value = player.user_steam_name;

            deleteToggle.appendChild(checkbox);
            deleteToggle.appendChild(hiddenInput);
            deleteToggleContainer.appendChild(deleteToggle);

            listItem.appendChild(playerContainer);
            listItem.appendChild(deleteToggleContainer);
            playerListContainer.appendChild(listItem);
        }

        updatePagination(playerList.length, currentPage);
    }

    function updatePagination(totalPlayers, currentPage) {
        const paginationContainer = document.getElementById('players_pagination_list_ul');
        const totalPages = Math.ceil(totalPlayers / playersPerPage);

        paginationContainer.innerHTML = '';

        // Always show "First" page link
        const firstPageItem = document.createElement('li');
        firstPageItem.classList.add('players_pagination_list_item');

        const firstPageLink = document.createElement('a');
        firstPageLink.href = `#`;
        firstPageLink.textContent = 'First page';
        firstPageLink.addEventListener('click', function (e) {
            e.preventDefault();
            renderPlayers(filteredPlayers, 1); // Go to the first page
        });

        firstPageItem.appendChild(firstPageLink);
        paginationContainer.appendChild(firstPageItem);

        // Determine the range of middle pages to display
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage === 1) {
            endPage = Math.min(4, totalPages - 1);
        } else if (currentPage === totalPages) {
            startPage = Math.max(totalPages - 3, 2);
        }

        // Render the middle pages
        for (let page = startPage; page <= endPage; page++) {
            const paginationItem = document.createElement('li');
            paginationItem.classList.add('players_pagination_list_item');
            if (page === currentPage) {
                paginationItem.classList.add('active');
            }

            const paginationLink = document.createElement('a');
            paginationLink.href = `#`;
            paginationLink.textContent = `Page ${page}`;
            paginationLink.addEventListener('click', function (e) {
                e.preventDefault();
                renderPlayers(filteredPlayers, page);
            });

            paginationItem.appendChild(paginationLink);
            paginationContainer.appendChild(paginationItem);
        }

        // Always show the last page link
        const lastPageItem = document.createElement('li');
        lastPageItem.classList.add('players_pagination_list_item');

        const lastPageLink = document.createElement('a');
        lastPageLink.href = `#`;
        lastPageLink.textContent = 'Last page';
        lastPageLink.addEventListener('click', function (e) {
            e.preventDefault();
            renderPlayers(filteredPlayers, totalPages);
        });

        lastPageItem.appendChild(lastPageLink);
        paginationContainer.appendChild(lastPageItem);
    }

    searchInput.addEventListener('input', function () {
        const query = searchInput.value.toLowerCase();

        // Filter players based on the search query
        filteredPlayers = serverPlayers.filter(player =>
            player.user_steam_name.toLowerCase().includes(query)
        );

        // Re-render players after filtering
        renderPlayers(filteredPlayers, 1); // Reset to page 1 after a new search
    });

    // Initial render
    renderPlayers(filteredPlayers, 1);
});
