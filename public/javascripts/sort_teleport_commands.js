document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('command_search_input');
    const commandListContainer = document.getElementById('current_bot_commands_list');
    const serverCommands = JSON.parse(document.getElementById('server_commands_data').value);

    const commandsPerPage = 10;
    let filteredCommands = [...serverCommands];

    function renderCommands(commandList, currentPage = 1) {
        const start = (currentPage - 1) * commandsPerPage;
        const end = Math.min(currentPage * commandsPerPage, commandList.length);

        // Clear the current list and prepare for the next pagination
        commandListContainer.innerHTML = '';

        // Render the commands for the current page
        for (let i = start; i < end; i++) {
            const command = commandList[i];
            const listItem = document.createElement('li');
            listItem.classList.add('current_command_list_item');

            // Create command container
            const commandContainer = document.createElement('div');
            commandContainer.id = 'current_bot_commands_container';

            const anchor = document.createElement('a');
            anchor.href = `teleportcommand/${encodeURIComponent(command.name)}`;
            anchor.textContent = command.name;
            commandContainer.appendChild(anchor);

            // Delete toggle container
            const deleteToggleContainer = document.createElement('div');
            deleteToggleContainer.id = 'delete_toggle_container';

            const deleteToggle = document.createElement('div');
            deleteToggle.id = 'current_command_delete_toggle';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'command_names_checkbox';
            checkbox.value = command.name;

            deleteToggle.appendChild(checkbox);
            deleteToggleContainer.appendChild(deleteToggle);

            listItem.appendChild(commandContainer);
            listItem.appendChild(deleteToggleContainer);
            commandListContainer.appendChild(listItem);
        }

        updatePagination(commandList.length, currentPage);
    }

    function updatePagination(totalCommands, currentPage) {
        const paginationContainer = document.getElementById('commands_pagination_list_ul');
        const totalPages = Math.ceil(totalCommands / commandsPerPage);

        paginationContainer.innerHTML = '';

        // First page link
        const firstPageItem = document.createElement('li');
        firstPageItem.classList.add('players_pagination_list_item');

        const firstPageLink = document.createElement('a');
        firstPageLink.href = `#`;
        firstPageLink.textContent = 'First page';
        firstPageLink.classList.add('players_pagination_list_link');
        firstPageLink.addEventListener('click', function (e) {
            e.preventDefault();
            renderCommands(filteredCommands, 1);
        });

        firstPageItem.appendChild(firstPageLink);
        paginationContainer.appendChild(firstPageItem);

        // Determine range of pages
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage === 1) {
            endPage = Math.min(4, totalPages - 1);
        } else if (currentPage === totalPages) {
            startPage = Math.max(totalPages - 3, 2);
        }

        // Render middle pages
        for (let page = startPage; page <= endPage; page++) {
            const paginationItem = document.createElement('li');
            paginationItem.classList.add('players_pagination_list_item');
            if (page === currentPage) {
                paginationItem.classList.add('active');
            }

            const paginationLink = document.createElement('a');
            paginationLink.href = `#`;
            paginationLink.textContent = `Page ${page}`;
            paginationLink.classList.add('players_pagination_list_link');
            paginationLink.addEventListener('click', function (e) {
                e.preventDefault();
                renderCommands(filteredCommands, page);
            });

            paginationItem.appendChild(paginationLink);
            paginationContainer.appendChild(paginationItem);
        }

        // Last page link
        const lastPageItem = document.createElement('li');
        lastPageItem.classList.add('players_pagination_list_item');

        const lastPageLink = document.createElement('a');
        lastPageLink.href = `#`;
        lastPageLink.textContent = 'Last page';
        lastPageLink.classList.add('players_pagination_list_link');
        lastPageLink.addEventListener('click', function (e) {
            e.preventDefault();
            renderCommands(filteredCommands, totalPages);
        });

        lastPageItem.appendChild(lastPageLink);
        paginationContainer.appendChild(lastPageItem);
    }

    searchInput.addEventListener('input', function () {
        const query = searchInput.value.toLowerCase();

        // Filter commands based on the search query
        filteredCommands = serverCommands.filter(command =>
            command.name.toLowerCase().includes(query)
        );

        // Re-render commands after filtering
        renderCommands(filteredCommands, 1);
    });

    // Initial render
    renderCommands(filteredCommands, 1);
});
