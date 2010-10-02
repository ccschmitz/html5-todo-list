var db;

try {
    if (window.openDatabase) {
        db = openDatabase("ToDo", "1.0", "HTML5 Todo List App", 200000);
		if (!db) {
            alert("Could not open the database on disk....");
		}
    } else {
        alert("Couldn't open the database.  Please try again with a more up to date browser....");
	}
} catch(err) { }

var activeList;

$(document).ready(function() {
	
	Todo.initDatabase();
	// Todo.clearDB();
	
	// Create a new list
	$('#new-list').click(function() {
		Todo.addList();
	});
	
	// Save list
	$('#lists li a').live('blur', function() {
		var listName = $(this).text();
		var listID = $(this).attr('id');
		Todo.saveList(listName, listID);
		$(this).attr('contenteditable', false);
	});
	
	// Delete list
	$('#delete-list').click(function() {
		var listID = $('#lists .active').attr('id');
		
		$('#lists .active').fadeTo(300, 0, function() {
			$('#lists li:first a').addClass('active');
				
			$(this).slideUp(500, function() {
				$(this).parent().remove();
				location.reload(true);
			});
		});
				
		Todo.removeList(listID);
	});
	
	// Load a list when list is clicked in sidebar
	$('#lists a').live('click', function() {
		if ($(this).is('.active')) {
			$(this).attr('contenteditable', true).focus();
			return false;
		} else {
			var listID = $(this).attr('id');
			Todo.loadList(listID);
			$('#lists .active').removeClass('active');
			$(this).addClass('active');
			return false;
		}
	});
	
	// Create a new list item
	$('#new-item').click(function() {
		Todo.addListItem();
	});
	
	// Save new item
	$('#main-list li .item-name').live('blur', function() {
		var itemName = $(this).text();
		var itemID = $(this).parent().attr('id');
		Todo.saveListItem(itemName, itemID);
	});
	
	// Mark item as complete
	$('.toggle').live('click', function() {
		var itemID = $(this).parent().attr('id');
		if ($(this).parent().is('.complete')) {
			$(this).parent().removeClass('complete');
			Todo.toggleListItemComplete(itemID, 1);
		} else {
			$(this).parent().addClass('complete');
			Todo.toggleListItemComplete(itemID);
		}
	});
	
	// Log completed items
	$('#log-complete').click(function() {
		$('#main-list li').each(function() {
			if ($(this).is('.complete')) {
				var itemID = $(this).attr('id');
				Todo.logCompleteItems(itemID);
				
				$(this).fadeTo(300, 0, function() {
					$(this).slideUp(500, function() {
						$(this).remove();
					});
				});
			}
		});
	});
	
	// Delete list item
	$('.delete').live('click', function() {
		var itemID = $(this).parent().attr('id');
		$(this).parent().fadeTo(300, 0, function() {
			$(this).slideUp(500, function() {
				$(this).remove();
			});			
		});
		Todo.removeListItem(itemID);
	});
	
});

// Create hotkey (CTRL + n) for creating a new list item
var isCtrl = false;

$(document).keyup(function (e) {
	if(e.which === 17) isCtrl = false;
}).keydown(function (e) {
	if(e.which === 17) isCtrl = true;
	if(e.which === 78 && isCtrl === true) {
		Todo.addListItem();
		return false;
	}
});

var Todo = function() {
		
	function execSql(sql) {
		db.transaction(function(tx) {
			tx.executeSql(sql, [],
				function() {
					// Do nothing
				}, function(tx, error) {
					reportError('SQL', error.message);
				}
			);
		});
	}    
	
	function checkDB() {
		// Check the lists table
		var lists = db.transaction(function(tx) {
			// See if the lists table has been created
			tx.executeSql("SELECT * FROM lists", [], null, function(tx, error) {
				// If there is no "lists" table, create one
				tx.executeSql("CREATE TABLE lists (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");
			});
		});
		
		// Check the items table
		var items = db.transaction(function(tx) {
			// See if the items table has been created
			tx.executeSql("SELECT * FROM items", [], null, function(tx, error) {
				// If there is no items table, create one
				tx.executeSql("CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, due_date REAL, complete INTEGER, displayed INTEGER, list_id INTEGER, indent INTEGER)");
			});
		});
	}
	
	function setListName(listID) {
		db.transaction(function(tx) {
			tx.executeSql("SELECT name FROM lists WHERE id = '"+ listID +"'", [], function(tx, rs) {
				for (var i = 0; i < rs.rows.length; i++) {
					$('h1').text(rs.rows.item(i)['name']);
				}
			});
		});
	}
	
	function loadLists(newList, init) {
		// Select all lists, loop through them and append a link in the sidebar for each of them
		db.transaction(function(tx) {
			// Select all lists from the lists tabel
			tx.executeSql("SELECT * FROM lists", [], function(tx, rs) {
				// Loop through the lists and 
				for (var i = 0; i < rs.rows.length; i++) {
					$('#lists').append('<li><a id="'+ rs.rows.item(i)['id'] +'" href="">'+ rs.rows.item(i)['name'] +'</a></li>');
				}
				// Add 'active' class to the first list
				$('#lists li:first a').addClass('active');
				
				if (newList === 1) {
					$('#lists li:last a').fadeOut(0, function() {
						$(this).fadeIn();
						$('#lists li:last a').attr('contenteditable', true).focus();
					});
				}
				
				if (init === 1) {
					loadListItems($('#lists li:first a').attr('id'));
				}
			});
		});
	}
	
	function loadListItems(listID, newItem) {
		// Select all list items from the current list and loop through them
		db.transaction(function(tx) {
			// Select all list items with the corresponding list_id of the selected list
			tx.executeSql("SELECT * FROM items WHERE list_id = "+ listID +" AND displayed = '1'", [], function(tx, rs) {
				// Loop through all the items found...
				for (var i = 0; i < rs.rows.length; i++) {
					// and append them to the #main-list
					var complete = rs.rows.item(i)['complete'];
					if (complete === 1) { complete = 'complete'; }
					$('#main-list').append('<li id="'+ rs.rows.item(i)['id'] +'" class="'+ complete +'"><span class="toggle"></span><span class="item-name" contenteditable>'+ unescape(rs.rows.item(i)['name']) +'</span><span class="delete"></span></li>');
				}
				
				setListName(listID);
				
				if (newItem === 1)
					$('#main-list li:last').fadeOut(0, function() {
						$(this).fadeIn();
						$('#main-list li:last .item-name').focus();
					});
			});
		});
	}
		
	function reportError(source, message) {
		alert('There was an '+ source +' error '+ message);
	}
	
	return { // Public Methods
				
		initDatabase : function() {
			// Check to see if the database tables have been created, and if not, create them
			checkDB();
			// Load all lists in the sidebar
			loadLists(0, 1);
		},
		
		clearDB : function() {
			execSql("DROP TABLE lists");
			execSql("DROP TABLE items");
		},
		
		addList : function() {
			execSql("INSERT INTO lists (name) VALUES ('New List')");
			
			$('#lists li').remove();
			
			loadLists(1);
		},
		
		saveList : function(listName, listID) {
			execSql("UPDATE lists SET name = '"+ listName +"' WHERE id = '"+ listID +"'");
		},
		
		loadList : function(listID) {
			// Fadeout #main-list
			$('#main-list').fadeTo(300, 0, function() {
				// Remove list items from #main-list
				$('#main-list li').remove();
				// Load list items from selected list
				loadListItems(listID);
				// Fade #main-list back in
				$('#main-list').fadeTo(300, 1);
			});
		},
		
		removeList : function(listID) {
			// Delete list
			execSql("DELETE FROM lists WHERE id = '"+ listID +"'");
			// Delete all items associated with that list
			execSql("DELETE FROM items WHERE list_id = '"+ listID +"'");
		},
		
		changeListPostion : function() {
			
		},
		
		loadListItems : function(listID) {
			
		},
		
		addListItem : function() {						
			var listID = $('#lists .active').attr('id');
			
			execSql("INSERT INTO items (name, due_date, complete, displayed, list_id, indent) VALUES ('New item', '02-23-2011', '0', '1', '"+ listID +"', '0')");
			
			$('#main-list li').remove();
			
			loadListItems(listID, 1);
		},
		
		saveListItem : function(itemName, itemID) {
			var listID = $('#lists .active').attr('id');
			
			execSql("UPDATE items SET name = '"+ escape(itemName) +"' WHERE id = '"+ itemID +"'");
		},
		
		removeListItem : function(itemID) {
			var listID = $('#lists .active').attr('id');

			execSql("DELETE FROM items WHERE id = '"+ itemID +"'");
		},
		
		changeListItemPosition : function() {
			
		},
		
		toggleListItemComplete : function(itemID, complete) {
			if (complete === 1) {
				execSql("UPDATE items SET complete = '0' WHERE id = '"+ itemID +"'");
			} else {
				execSql("UPDATE items SET complete = '1' WHERE id = '"+ itemID +"'");
			}
		},
		
		logCompleteItems : function(itemID) {
			execSql("UPDATE items SET displayed = '0' WHERE id = '"+ itemID +"'");
		}
		
	}
	
}();