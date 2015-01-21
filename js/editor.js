function setup_editor(div, count) {
  count = typeof count !== 'undefined' ? count : 15;
  var editor_div = div.find(".editor");
  var diagram_div = div.find(".diagram");
  var theme_div = div.find(".theme");
  var download_link = div.find('.download');

  // Setup the editor diagram
  var editor = ace.edit(editor_div.get(0));
  editor_div.data('editor', editor);
  editor.setTheme("ace/theme/crimson_editor");
  var doc = editor.getSession().getDocument();

  editor.getSession().on('change', _.debounce(on_change, 100));

  on_change();
  download_link.click(function (ev) {
    var svg = diagram_div.find('svg')[0];
    var width = parseInt(svg.width.baseVal.value);
    var height = parseInt(svg.height.baseVal.value);
    var data = editor.getValue();
    var xml = '<?xml version="1.0" encoding="utf-8" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd"><svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" xmlns:xlink="http://www.w3.org/1999/xlink"><source><![CDATA[' + data + ']]></source>' + svg.innerHTML + '</svg>';

    var a = $(this);
    a.attr("download", "diagram.svg");
    a.attr("href", "data:image/svg+xml," + encodeURIComponent(xml));
  });


  function on_change() {
    try {
      var diagram = Diagram.parse(editor.getValue());

      editor.getSession().setAnnotations([]);

      // Clear out old diagram
      diagram_div.html('');

      var options = {
        theme: 'simple',
        scale: 1
      };

      // Draw
      diagram.drawSVG(diagram_div.get(0), options);

    } catch (err) {
      var annotation = {
        type: "error", // also warning and information
        column: 0,
        row: 0,
        text: err.message
      };
      if (err instanceof Diagram.ParseError) {
        annotation.row = err.loc.first_line - 1;
        annotation.column = err.loc.first_column;
      }
      editor.getSession().setAnnotations([annotation]);
      throw err;
    }

    // assuming a line height of 16 pixels...
    if(editor_div[0].style !== undefined) {
      // Font is about 20 px;
      var newHeight = 20 * doc.getLength();
      if (newHeight > 250) {

        editor_div[0].style.height =  newHeight + 'px';
        $(editor_div).closest('.editor-wrapper').css('height', newHeight + 'px');
        editor.resize();
      }
    }



  }
}

$(document).ready(function () {
  var dataFileName = window.location.hash.substr(1) + '-data.json';

  $.ajax({
    dataType: "json",
    url: 'data/' + dataFileName,
    complete: function (response, status) {
      var diagrams;
      if (status != "success") {
        diagrams = [
          {
            "steps": [
              "title: unavngivet",
              "Participant Bruger",
              "Participant Portal",
              "Participant CRM",
              "",
              "Bruger->Portal: action",
              "Portal->CRM: servicecall(args)",
              "CRM-->Portal: Response1, Response2"
            ]
          }
        ];
      } else {
        diagrams = JSON.parse(response.responseText);
      }

      for (var i = 0; i < diagrams.length; i++) {
        var diagram = diagrams[i];
        var diagram_markup = $("#template").clone();

        diagram_markup.addClass('diagraminstance');
        diagram_markup.removeClass('template');

        diagram_markup.attr('id', 'diagram' + i);
        var steps_text = diagram.steps.join('\n');
        if (steps_text.substring(0, 6) != "title:") {
          steps_text = "title: " + diagram.title + "\n" + steps_text;
        }
        $('.editor', diagram_markup).html(steps_text);
        $('.editor', diagram_markup).attr('id', 'editor' + i);

        window.document.getElementById("main").appendChild(diagram_markup[0]);

        setup_editor(diagram_markup, steps_text.split("\n").length);
      }

      $("#template").remove();
    }
  });


  ZeroClipboard.config( { moviePath: 'js/zeroclipboard/ZeroClipboard.swf' } );
  var client = new ZeroClipboard();



  var getExport = function(){
    var exportData = new Array();
    $('.diagraminstance').each(function(index, d){
      var editor = $('.editor', d).data('editor');
      if(editor == null) {
        return;
      }

      var instance = {
        steps: editor.getSession().getValue().split('\n')
      };

      exportData.push(instance);
    });

    return JSON.stringify(exportData, undefined, 2);
  };

  client.on( 'dataRequested', function (client, args) {
    client.setText( getExport() );
  });

  client.clip(document.getElementById("copy"));


  $("#export").click(function(){
    var a = $(this);
    if (dataFileName.length == "-data.json".length) {
      dataFileName = 'changeme-data.json';
    }
    a.attr("download", dataFileName);
    a.attr("href", "data:application/json," + encodeURIComponent(getExport()));
  });


});
