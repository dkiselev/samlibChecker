var checker = {

	render:function(){
		var html = '';
		var checkList = localStorage.getItem("checkList");
		checkList = checkList ? JSON.parse(checkList) : {};
		if(!$.isEmptyObject(checkList)){
			$.each(checkList, function(authorPage, author){
				if(author.updated){
					var ahtml = '';
					$.each(author.pages, function(pageTitle, page){
						if(pageTitle && page.updated)
							ahtml += '<li><a href="#" class="book" data-author-url="'+authorPage+'" data-page-url="'+pageTitle+'">'+page.name+' </a><em class="book-size"> '+page.size+ '</em></li>';
						
					});
					if(ahtml)
						html += '<div><strong>' + author.name + '</strong><ul class="book">' + ahtml + '</ul></div>';
				}
			});
		}
		return html || 'Нет обновлений.';
	},

	markReaded:function(authorPage, pageTitle){
		var checkList = localStorage.getItem("checkList");
		checkList = checkList ? JSON.parse(checkList) : {};
		if(!$.isEmptyObject(checkList)){
			var author = checkList[authorPage];
			author.pages[pageTitle].updated = false;
			var updated = false;
			$.each(author.pages, function(pageTitle, page){
				if(page.updated) 
					updated = true;
				return !updated;
			});
			author.updated = updated;
			localStorage.setItem("checkList", JSON.stringify(checkList));
		}
	},
	
	parse: function(text){
		var checkList = localStorage.getItem("checkList");
		checkList = checkList ? JSON.parse(checkList) : {};
		if(!$.isEmptyObject(checkList)){

			$.each(text.split("\n"), function(i, s){
				if(!s) return true;
				var arr = s.split("\t");
				
				var bookPage = arr[0];
				var idx = bookPage.lastIndexOf('/');
				var authorPage = bookPage.substring(0, idx+1);
				
				var author = checkList[authorPage];
				if(!author) return true;
				
				var pageTitle = bookPage.substring(idx+1);
				var prevPage = author.pages[pageTitle];

				if(pageTitle && (author.inCheckList || prevPage && prevPage.inCheckList)){

					var genres = $.map((arr[5]||'').split(','), function(val, idx){
						return $.trim(val);
					});

					var page = {name:arr[1], size:arr[3], hash: arr[4], genre: genres, inCheckList: false, updated: true};

					// если была такая страница в обзоре и у нее не изменился хэш, то эта страница не обновлена
					if(prevPage){
						page.inCheckList = prevPage.inCheckList;
						if(!prevPage.updated && prevPage.hash == page.hash){
							page.updated = false;
						}
					}
					author.pages[pageTitle] = page;
				}
			});
			
			$.each(checkList, function(authorPage, author){
				var updated = false;
				$.each(author.pages, function(pageTitle, page){
					if(page.updated) 
						updated = true;
					return !updated;
				});
				author.updated = updated;
			});
			localStorage.setItem("checkList", JSON.stringify(checkList));
		}
	}
};

$(document).ready(function(){

	var list = $('#list');
	list.html(checker.render());

	$(document)
		.on('click', '#popupOptions', function(e){
			e.preventDefault();
			chrome.tabs.create({url:'options.html'});
		})
		.on('click', 'a.book', function(e){
			e.preventDefault();
			var b = $(this), authorPage = b.attr('data-author-url'), pageTitle = b.attr('data-page-url'), pageUrl = authorPage + pageTitle;
			checker.markReaded(authorPage, pageTitle);
			list.html(checker.render());
			chrome.tabs.create({url:pageUrl});
		})
		.on('click', '#popupUpdate', function(e){
			e.preventDefault();
			list.html('Подождите, идет загрузка...');
			$.get("http://samlib.ru/4lib_news", function(data) {
				checker.parse(data);
				list.html(checker.render());
			})
			.fail(function() { list.html('Ошибка при обновлении данных.'); });				
		});
		
	function check(){
		$('#popupUpdate').click();
	}
	
	setInterval(check, 30*60*1000);	
});

