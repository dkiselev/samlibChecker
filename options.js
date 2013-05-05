var config = {
	data: {},
	genre: [],
	
	parseByUrl: function(url, data){
		var idx = url.lastIndexOf('/');
		var authorPage = url.substring(0, idx+1);
		var pageTitle = url.substring(idx+1);
	
		var authorName = '';
		var bookName = '';
		
		if(!pageTitle || /index.shtml|indexdate.shtml|indextitle.shtml/i.test(pageTitle)){
			idx = data.indexOf('.', data.indexOf("<title>")) + 1;
			authorName = data.substring(idx, data.indexOf('.', idx));
			pageTitle = '';
		}
		else{
			idx = data.indexOf("<title>") + 7;
			var idx2 = data.indexOf('.', idx);
			authorName = data.substring(idx, idx2);
			bookName = $.trim(data.substring(idx2+1, data.indexOf('<', idx2)));
		}
		config.parse(authorPage+pageTitle+'\t'+bookName+'\t'+authorName+'\t\t\t\t');
		//console.log(url, authorName, authorPage, pageTitle, bookName);
	},
	
	parse: function(text){
		var checkList = localStorage.getItem("checkList");
		config.data = checkList ? JSON.parse(checkList) : {};
		config.genre = [];

		$.each(text.split("\n"), function(i, s){
			if(!s) return;
			var arr = s.split("\t");
			
			var bookPage = arr[0];
			var idx = bookPage.lastIndexOf('/');
			var authorPage = bookPage.substring(0, idx+1);
			
			var author = config.data[authorPage];
			if(!author){
				author = { pages:{}, name: arr[2], inCheckList: false, updated: false };
				config.data[authorPage] = author;
			}

			var pageTitle = bookPage.substring(idx+1);
			if(!pageTitle) return;
			
			var genres = $.map((arr[5]||'').split(','), function(val, idx){
				return $.trim(val);
			});
			
			var page = {name:arr[1], size:arr[3], hash: arr[4], genre: genres, inCheckList: false, updated: true};

			var prevPage = author.pages[pageTitle];

			// если была такая страница в обзоре и у нее не изменился хэш, то эта страница не обновлена
			if(prevPage){
				page.inCheckList = prevPage.inCheckList;
				if(!prevPage.updated && prevPage.hash == page.hash){
					page.updated = false;
				}
			}
			
			author.pages[pageTitle] = page;
		});
		
		$.each(config.data, function(authorPage, author){
			var updated = false;
			$.each(author.pages, function(pageTitle, page){
				
				$.each(page.genre, function(idx, g){
					if(g && $.inArray(g,config.genre) < 0)
						config.genre.push(g);
				});
				
				if(page.updated) 
					updated = true;
				return !updated;
			});
			author.updated = updated;
		});
	},
	
	bookToggle: function(authorPage, pageTitle, toggle){
		config.data[authorPage].pages[pageTitle].inCheckList = toggle;
	},

	authorToggle: function(authorPage, toggle){
		config.data[authorPage].inCheckList = toggle;
	},
	
	save: function(){
		var checkList = {};
		$.each(config.data, function(authorPage, author){
			var a = $.extend(true, {}, author);
			if(a.inCheckList) 
				checkList[authorPage] = a;
			else{
				$.each(a.pages, function(pageTitle, page){
					if(!page.inCheckList) 
						delete a.pages[pageTitle];
				});
				if(!$.isEmptyObject(a.pages)){
					checkList[authorPage] = a;
				}
			}
		});
		localStorage.setItem("checkList", JSON.stringify(checkList));
	},
	
	render: function(){
		var html = '';

		$.each(config.data, function(authorPage, author){
			html += '<div><input type="checkbox" class="author-toggle" data-url="'+authorPage+'" '+(author.inCheckList?'checked ': '')+'title="Cледить за автором"/>';
			html += '<strong>' + author.name + '</strong>';
			html += '<em> <a href="'+authorPage+'">'+authorPage+'</a></em>';
			html += '<ul class="book">';
			
			$.each(author.pages, function(pageTitle, page){
				if(!pageTitle) return;
				html += '<li data-genre="' + page.genre.concat() + '"><input type="checkbox" class="book-toggle" '+(page.inCheckList?'checked ': '')+'data-author-url="'+authorPage+'" data-page-url="'+pageTitle+'" title="Cледить за страницей"/>';
				html += '<span>'+page.name+' </span><em> '+page.size+ ' <a href="'+authorPage+pageTitle+'">' +pageTitle+'</a> ' + page.genre.concat() + '</em></li>';
			});
			
			html += '</ul></div>';
		});
		
		return html;
	},

	renderGenre: function(){
		var html = '';
		$.each(config.genre, function(idx, val){
			html += '<label><input type="checkbox" class="genre" data-genre="'+val+'" />'+val+'</label> ';
		});
		return html;
	}

	//li data-genre
};
$(document).ready(function(){

	var list = $('#list'), pgurl = $('#pageurl'), genre = $('#genre');
	config.parse("");
	list.html(config.render());
	genre.html(config.renderGenre());
	
	function doAdd(){
		var val = $.trim(pgurl.val());
		if(val){
			if(val.lastIndexOf('.shtml') < 0){
				if(val.lastIndexOf('/') != val.length-1){
					val += '/';
					pgurl.val(val);
				}
			}
			list.html('Подождите, идет загрузка...');
			$.get(val)
			.done(function(data) {
				config.parseByUrl(val, data);
				list.html(config.render());
				genre.html(config.renderGenre());
			})
			.fail(function() { list.html('Ошибка при обновлении данных.'); });				
		}
	}

	$(document)
		.on('click', 'input.book-toggle', function(){
			var b = $(this), authorPage = b.attr("data-author-url"), pageTitle = b.attr("data-page-url");
			config.bookToggle(authorPage, pageTitle, b.prop("checked"));
			list.html(config.render());
		})
		.on('click', 'input.author-toggle', function(){
			var b = $(this), authorPage = b.attr("data-url");
			config.authorToggle(authorPage, b.prop("checked"));
			list.html(config.render());
		})
		.on('click', 'input.genre', function(){
			var checkedGenre = genre.find('input.genre:checked');
			if(checkedGenre.length > 0){
				var items = $('li[data-genre]',list).hide();
				checkedGenre.each(function(){
					items.filter('[data-genre*="'+$(this).attr("data-genre")+'"]').show().end();
				});
			}else{
				$('li[data-genre]',list).show();
			}
		})
		.on('click', '#save', function(){
			config.save();
			window.close();
		})
		.on('click', '#add', doAdd)
		.on('keydown', '#pageurl', function(e){
			if(e.keyCode === 13)
				doAdd();
		})
		.on('click', '#load', function(){
			list.html('Подождите, идет загрузка...');
			$.get("http://samlib.ru/4lib_news", function(data) {
				config.parse(data);
				list.html(config.render());
				genre.html(config.renderGenre());
			})
			.fail(function() { list.html('Ошибка при обновлении данных.'); });				
		});
});

