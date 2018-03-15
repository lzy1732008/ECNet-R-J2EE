
var headerIndex = 0;//当前链头id
var headerList = {};//存储链头，{id:node}
var bodyIndex = 0;//当前链体id
var bodyList = {};//存储链体，{id:{'node':node,'type':'XXX','committer':'XXX','reason':'XXXXXX','conclusion':'XXXXXX'}}
var jointIndex = 0;//当前连接点（事实）id
var jointList = {};//存储连接点（事实），{id:{'node':node,'type':'XXX'}}
var arrowIndex = 0;//当前箭头id
var arrowList = {};//存储箭头，{id:node}
var operationList = [];//存储每一步操作，[{'type':'add/delete/copy','nodes':[]},
                        // {'type':'move','nodes':[],'position_origin':[x,y]}]

var isNodeClicked_right = false;//节点（链头、链体、连接点、连线、箭头）右键点击
var isNodeClicked_left = false;//节点（链头、链体、连接点、连线、箭头）左键点击
var nodeList_selected = [];//已选中的节点（链头、链体、连接点、连线、箭头），[node]
var isCtrlPressed = false;//ctrl键是否按下
var nodeFroms = [];//连线or箭头起始节点（允许同时创建多个连线或箭头），存储在nodeList_selected中的index
var nodeTo;//连线or箭头终止节点
var header_radius = 25;//链头节点半径
var body_width = 80;//链体节点长
var body_height = 30;//链体节点宽
var joint_width = 30;//连接点边长
var continuous_header = false;//是否连续绘制链头
var continuous_body = false;//是否连续绘制链体
var continuous_joint = false;//是否连续绘制连接点
var isCopied = false;//是否点击复制图元
var nodeList_copied = [];//已选中复制的节点
// var nodeList_move = [];//移动的节点
var x_origin,y_origin = 0;//拖拽节点的初始位置
var tranX_scene,tranY_scene = 0;//拖拽场景的初始位置
// var x_now,y_now = 0;
var sourceNode;//拖拽节点（当选中多个节点进行拖拽时，鼠标拖拽的节点即参照节点）

$(document).ready(function(){

    canvas = document.getElementById('canvas');
    stage = new JTopo.Stage(canvas); // 创建一个舞台对象
    scene = new JTopo.Scene(stage); // 创建一个场景对象

    stage.addEventListener("mouseover", function(event){
        console.log("鼠标进入");
    });

    stage.addEventListener("mousedrag", function(event){
        console.log("拖拽");

    });

    stage.addEventListener("mousedown", function(event){
        console.log("mouse down");

        tranX_scene = scene.translateX;
        tranY_scene = scene.translateY;
        console.log(tranX_scene+'@@'+tranY_scene);
    });

    stage.addEventListener("mouseup", function(event){
        console.log("mouse up");

        if(event.button == 2){
            console.log ('松开右键');

            if(!isNodeClicked_right){
                $("#nodeMenu").hide();
                $("#nodeMenu2").hide();
                $("#nodeMenu3").hide();
                $("#linkMenu").hide();
                $("#arrowMenu").hide();

                $('.evidence').css('background-color', 'white');
                $('.evidence_plaintiff').css('background-color', '#5ed7e5');
                $('.evidence').find('.head_chain').css('background-color', 'white');
                $('.evidence_plaintiff').find('.head_chain').css('background-color', '#5ed7e5');

                $("#stageMenu").css({
                    top: getMousePosition(event).y,
                    left: getMousePosition(event).x
                }).show();

                if(!isNodeClicked_left){
                    nodeList_selected = [];
                }
            }
        }

        if(event.button == 0){
            console.log ( '松开左键');

            // 关闭弹出菜单
            $("#stageMenu").hide();
            $("#nodeMenu").hide();
            $("#nodeMenu2").hide();
            $("#nodeMenu3").hide();
            $("#linkMenu").hide();
            $("#arrowMenu").hide();

            if(!isNodeClicked_right){
                $('.evidence').css('background-color', 'white');
                $('.evidence_plaintiff').css('background-color', '#5ed7e5');
                $('.evidence').find('.head_chain').css('background-color', 'white');
                $('.evidence_plaintiff').find('.head_chain').css('background-color', '#5ed7e5');
            }
            isNodeClicked_right = false;

            if(!isNodeClicked_left){
                nodeList_selected = [];
            }
            isNodeClicked_left = false;

            if(continuous_header){
                var node = drawHeader(event.pageX-$("#canvas").offset().left,event.pageY-$("#canvas").offset().top);

                //添加操作至operationList
                operationList.push({'type':'add','nodes':[node]});

            }else if(continuous_body){
                var node = drawBody(event.pageX-$("#canvas").offset().left,event.pageY-$("#canvas").offset().top);

                //添加操作至operationList
                operationList.push({'type':'add','nodes':[node]});
            }else if(continuous_joint){
                var node = drawJoint(event.pageX-$("#canvas").offset().left,event.pageY-$("#canvas").offset().top);

                //添加操作至operationList
                operationList.push({'type':'add','nodes':[node]});
            }
        }

        addMoveOperations();
    });

    stage.addEventListener("mousemove", function(event){

    });

    this.addEventListener("keydown", function(event){
        if(event.keyCode == 17){
            isCtrlPressed = true;
        }
    });
    this.addEventListener("keyup", function(event){
        if(event.keyCode == 17){
            isCtrlPressed = false;
        }
    });

    dragHeader();
    dragBody();
    dragJoint();
    dragHandle();

    quickDraw();
    bindMenuClick();
    bindRightPanel();


    $('#saveImg-btn').click(function () {
        stage.saveImageInfo();
    });
    $('#revoke-btn').click(function () {
        undo();
    });
    $('#layout-btn').click(function () {
        typeSetting();
    });

    var evidences_adoption = [{"证据":"证据1XXXXXXXXXXXXXXX","链头":["链头1","链头2"],"原告":1},
        {"证据":"证据2XXXXXXXXXXXXXXX","链头":["链头1","链头2"],"原告":0},
        {"证据":"证据3XXXXXXXXXXXXXXX","链头":["链头1","链头2"],"原告":0}];
    initGraph(evidences_adoption);

});

//将移动操作加入operationList
function addMoveOperations() {
    var x_now,y_now;
    // nodeList_move = nodeList_selected;
    if(nodeList_selected.length==0){
        x_now = scene.translateX;
        y_now = scene.translateY;
        if(x_now!=tranX_scene||y_now!=tranY_scene)
            operationList.push({'type':'move','nodes':null,'position_origin':[tranX_scene,tranY_scene]});

    }else{
        x_now = sourceNode.x;
        y_now = sourceNode.y;
        if(x_now!=x_origin||y_now!=y_origin)
            operationList.push({'type':'move','nodes':nodeList_selected,'position_origin':[x_origin,y_origin],'source':sourceNode});
    }
}

//撤销
function undo() {
    if(operationList.length<=0)
        return -1;

    var operation = operationList.pop();

    if(operation['type']=='add'||operation['type']=='copy'){

        for(var i = 0;i<operation['nodes'].length;i++){
            var node = operation['nodes'][i];

            if(node.node_type=='header'){
                deleteHeader(node);

            }else if(node.node_type=='body'){
                deleteBody(node);

            }else if(node.node_type=='joint'){
                deleteJoint(node);

            }else if(node.node_type=='arrow'){
                deleteArrow(node);

            }else if(node.node_type=='link'){
                scene.remove(node);
            }
        }

    }else if(operation['type']=='delete'){

        for(var i = 0;i<operation['nodes'].length;i++){
            var node = operation['nodes'][i];

            if(node.node_type=='header'){
                drawHeader(node.x,node.y,node.text,node.content);

            }else if(node.node_type=='body'){
                drawBody(node.x,node.y,node.text,node.content,bodyList[node.id]['type'],
                    bodyList[node.id]['committer'],bodyList[node.id]['reason'],bodyList[node.id]['conclusion']);

            }else if(node.node_type=='joint'){
                drawJoint(node.x,node.y,node.text,node.content,jointList[node.id]['type']);

            }else if(node.node_type=='arrow'){
                addArrow(node.nodeA,node.nodeZ,node.text,node.content);

            }else if(node.node_type=='link'){
                addLink(node.nodeA,node.nodeZ);
            }
        }

    }else if(operation['type']=='move'){
        if(operation['nodes']==null){
            scene.translateX = operation['position_origin'][0];
            scene.translateY = operation['position_origin'][1];
        }else{
            var x_offset = operation['position_origin'][0]-operation['source'].x;
            var y_offset = operation['position_origin'][1]-operation['source'].y;

            for(var i = 0;i<operation['nodes'].length;i++){
                var node_temp = operation['nodes'][i];
                node_temp.x+=x_offset;
                node_temp.y+=y_offset;
            }
        }
    }
}

//连续画图
function quickDraw() {
    $('#add-header-btn-toggle').click(function () {
        if(continuous_header){
            continuous_header = false;
            $(this).css({'background-color':'white'});
        }else{
            continuous_header = true;
            continuous_body = false;
            continuous_joint = false;
            $(this).css({'background-color':'grey'});
            $('#add-body-btn-toggle').css({'background-color':'white'});
            $('#add-joint-btn-toggle').css({'background-color':'white'});
        }
    });

    $('#add-body-btn-toggle').click(function () {

        if(continuous_body){
            continuous_body = false;
            $(this).css({'background-color':'white'});
        }else{
            continuous_body = true;
            continuous_header = false;
            continuous_joint = false;
            $(this).css({'background-color':'grey'});
            $('#add-header-btn-toggle').css({'background-color':'white'});
            $('#add-joint-btn-toggle').css({'background-color':'white'});
        }
    });

    $('#add-joint-btn-toggle').click(function () {

        if(continuous_joint){
            continuous_joint = false;
            $(this).css({'background-color':'white'});
        }else{
            continuous_joint = true;
            continuous_header = false;
            continuous_body = false;
            $(this).css({'background-color':'grey'});
            $('#add-header-btn-toggle').css({'background-color':'white'});
            $('#add-body-btn-toggle').css({'background-color':'white'});
        }
    });
}

//button拖拽方法
function dragHandle() {

    $("#draggableDiv").mouseup(function (event) {
        $(this).css({ "height": "0" });
    });

    $("#draggableDiv").draggable({
        // containment: "parent",
        drag: function (event) {
            // console.log('drag');
        },
        stop: function () {
            //拖拽结束，将拖拽容器内容清空
            console.log('drag stop');
            $("#draggableDiv").html("");
            $("#draggableDiv").css({
                "height": "0",
                "background-color":'transparent'});
        }
    });

    //“放”的操作代码
    $("#canvas").droppable({
        drop: function (event) {

            if(event.pageX-$("#canvas").offset().left>=0&&event.pageY-$("#canvas").offset().top>=0){

                if($("#draggableDiv").find('i').attr('class')!=null){
                    var className = $("#draggableDiv").find('i').attr('class');

                    if(className.indexOf('circle')>-1){
                        var node = drawHeader(event.pageX-$("#canvas").offset().left,event.pageY-$("#canvas").offset().top);
                        //添加操作至operationList
                        operationList.push({'type':'add','nodes':[node]});

                    }else if(className.indexOf('square')>-1) {
                        var node = drawJoint(event.pageX - $("#canvas").offset().left, event.pageY - $("#canvas").offset().top);
                        //添加操作至operationList
                        operationList.push({'type': 'add', 'nodes': [node]});
                    }
                }else if($("#draggableDiv").width()==body_width) {
                    var node = drawBody(event.pageX - $("#canvas").offset().left, event.pageY - $("#canvas").offset().top);
                    //添加操作至operationList
                    operationList.push({'type': 'add', 'nodes': [node]});
                }
            }
        }
    });
}

//add-header-btn与拖拽方法绑定
function dragHeader() {
    $( "#add-header-btn" ).bind("mousedown", function (event) {

        if(event.button == 0){
            var draggableDiv = $("#draggableDiv");
            $(draggableDiv).css({
                "display": "block",
                "width": (header_radius*2)+"px",
                "height": (header_radius*2)+"px",
                "top": event.pageY-$(this).offset().top-header_radius,
                "left": event.pageX-$(this).offset().left,
                "font-size": (header_radius*2)+"px",
                "color": 'rgba(22,124,255,0.7)'});

            var clickElement = "<i class=\"fa fa-circle\" aria-hidden=\"true\"></i>";
            $("#draggableDiv").html(clickElement);
            draggableDiv.trigger(event);
        }
        //取消默认行为
        return false;
    });
}

//add-body-btn与拖拽方法绑定
function dragBody() {
    $( "#add-body-btn" ).bind("mousedown", function (event) {

        if(event.button == 0){
            var draggableDiv = $("#draggableDiv");
            // console.log('x:'+event.pageX+';y:'+event.pageY+';left:'+$(this).parent().offset().left+';top:'+$(this).parent().offset().top);
            $(draggableDiv).css({
                "display": "block",
                "width": body_width+"px",
                "height": body_height+"px",
                "top": event.pageY-$(this).parent().parent().offset().top,
                "left": event.pageX-$(this).parent().parent().offset().left-(body_width/2),
                "background-color":'rgba(22,124,255,0.7)'});

            draggableDiv.trigger(event);
        }
        //取消默认行为
        return false;
    });
}

//add-joint-btn与拖拽方法绑定
function dragJoint() {
    $( "#add-joint-btn" ).bind("mousedown", function (event) {

        if(event.button == 0){
            var draggableDiv = $("#draggableDiv");
            // console.log('x:'+event.pageX+';y:'+event.pageY+';left:'+$(this).parent().offset().left+';top:'+$(this).parent().offset().top);
            $(draggableDiv).css({
                "display": "block",
                "width": joint_width+"px",
                "height": joint_width+"px",
                "top": event.pageY-$(this).parent().parent().offset().top-(joint_width/2),
                "left": event.pageX-$(this).parent().parent().offset().left-(joint_width/2),
                "font-size": joint_width+"px",
                "color": 'rgba(22,124,255,0.7)'});

            var clickElement = "<i class=\"fa fa-square\" aria-hidden=\"true\"></i>";
            $("#draggableDiv").html(clickElement);
            draggableDiv.trigger(event);
        }
        //取消默认行为
        return false;
    });
}

//获取鼠标相对右侧div位置
function getMousePosition(event) {
    var p = $('#canvas').parent().parent();
    // console.log('px:'+p.offset().left+';py:'+p.offset().top);
    // console.log('x:'+event.pageX+';y:'+event.pageY);

    return {
        x: event.pageX - p.offset().left,
        y: event.pageY - p.offset().top
    };
}

//处理节点多选不同右键菜单显示
function handleMultipleSelected(event) {

    if(nodeList_selected.length<=1)
        return -1;

    var header_num = 0;
    var body_num = 0;
    var link_num = 0;
    var arrow_num = 0;
    var joint_num = 0;

    var header_index = [];
    var body_index = [];
    var joint_index = [];

    for(var i = 0;i<nodeList_selected.length;i++){

        if(nodeList_selected[i].node_type=='header'){
            header_index.push(i);
            header_num++;

        }else if(nodeList_selected[i].node_type=='body'){
            body_index.push(i);
            body_num++;

        }else if(nodeList_selected[i].node_type=='link'){
            link_num++;

        }else if(nodeList_selected[i].node_type=='arrow'){
            arrow_num++;

        }else if(nodeList_selected[i].node_type=='joint'){
            joint_index.push(i);
            joint_num++;
        }
    }
    // console.log("header_num:"+header_num+";body_num:"+body_num+";link_num:"+link_num+";arrow_num:"+arrow_num+";joint_num:"+joint_num);

    if(header_num>=1&&body_num==1&&link_num==0&&arrow_num==0&&joint_num==0){//多个链头一个链体可以创建连线
        $("#nodeMenu2").css({
            top: getMousePosition(event).y,
            left: getMousePosition(event).x
        }).show();

        nodeFroms = header_index;
        nodeTo = nodeList_selected[body_index[0]];
        return 1;

    }else if(header_num>=1&&body_num==0&&link_num==0&&arrow_num==0&&joint_num==1){//多个链头一个连接点可以创建箭头
        $("#nodeMenu3").css({
            top: getMousePosition(event).y,
            left: getMousePosition(event).x
        }).show();

        nodeFroms = header_index;
        nodeTo = nodeList_selected[joint_index[0]];
        return 2;

    }else{
        $("#nodeMenu").css({
            top: getMousePosition(event).y,
            left: getMousePosition(event).x
        }).show();
        return 0;
    }
}

//判断node是否已在nodeList_selected中
function existInSelected(node) {

    for(var i = 0;i<nodeList_selected.length;i++){
        if(nodeList_selected[i]==node){
            return true;
        }
    }

    return false;
}

//处理节点右键菜单显示
function handleNodeMenu(event,type,node){

    if(event.button == 0) {// 左键

        if(isCtrlPressed){
            if(!existInSelected(node))
                nodeList_selected.push(node);
        }else{
            if(!existInSelected(node))
                nodeList_selected = [node];
        }
        isNodeClicked_left = true;
    }

    if(event.button == 2){// 右键

        if(isCtrlPressed){
            if(!existInSelected(node))
                nodeList_selected.push(node);
        }else{
            if(!existInSelected(node))
                nodeList_selected = [node];
        }

        $("#stageMenu").hide();
        $("#nodeMenu").hide();
        $("#nodeMenu2").hide();
        $("#nodeMenu3").hide();
        $("#linkMenu").hide();
        $("#arrowMenu").hide();

        if(handleMultipleSelected(event)<0){

            if(type=='arrow'){
                $("#arrowMenu").css({
                    top: getMousePosition(event).y,
                    left: getMousePosition(event).x
                }).show();

            }else if(type=='link'){
                $("#linkMenu").css({
                    top: getMousePosition(event).y,
                    left: getMousePosition(event).x
                }).show();

            }else{
                $("#nodeMenu").css({
                    top: getMousePosition(event).y,
                    left: getMousePosition(event).x
                }).show();
            }
        }

        isNodeClicked_right = true;

    }
}

//右键菜单方法调用
function bindMenuClick() {
    //新增图元-链头
    $('#add-header-li').click(function (event) {
        $('#stageMenu').hide();

        var node = drawHeader(event.pageX-$("#canvas").offset().left,event.pageY-$("#canvas").offset().top);

        //添加操作至operationList
        operationList.push({'type':'add','nodes':[node]});
    });

    //新增图元-链体
    $('#add-body-li').click(function (event) {
        $('#stageMenu').hide();

        var node = drawBody(event.pageX-$("#canvas").offset().left,event.pageY-$("#canvas").offset().top);

        //添加操作至operationList
        operationList.push({'type':'add','nodes':[node]});
    });

    //新增图元-连接点
    $('#add-joint-li').click(function (event) {
        $('#stageMenu').hide();

        var node = drawJoint(event.pageX-$("#canvas").offset().left,event.pageY-$("#canvas").offset().top);

        //添加操作至operationList
        operationList.push({'type':'add','nodes':[node]});
    });

    //创建连线
    $('#add-link-li').click(function () {
        $(this).parent().hide();

        var nodes = [];
        for(var i = 0;i<nodeFroms.length;i++){
            var node = addLink(nodeList_selected[nodeFroms[i]],nodeTo);
            if(node!=-1){
                nodes.push(node);
            }
        }

        //添加操作至operationList
        operationList.push({'type':'add','nodes':nodes});
    });

    //创建箭头
    $('#add-arrow-li').click(function () {
        $(this).parent().hide();

        var nodes = [];
        for(var i = 0;i<nodeFroms.length;i++){

            var node = addArrow(nodeList_selected[nodeFroms[i]],nodeTo,null,'');
            if(node!=-1){
                nodes.push(node);
            }
        }

        //添加操作至operationList
        operationList.push({'type':'add','nodes':nodes});
    });

    //复制图元
    $('.copy-element-li').click(function () {
        $(this).parent().hide();

        isCopied = true;
        nodeList_copied = nodeList_selected;
    });

    //粘贴图元
    $('#paste-element-li').click(function (event) {
        $(this).parent().hide();

        var nodes = [];
        for(var i = 0;i<nodeList_copied.length;i++){
            var node = nodeList_copied[i];
            var node_new;

            if(node.node_type=='header'){
                node_new = drawHeader(event.pageX-$("#canvas").offset().left,event.pageY-$("#canvas").offset().top,node.text,node.content);

            }else if(node.node_type=='body'){
                var origin = bodyList[node.id];
                node_new = drawBody(event.pageX-$("#canvas").offset().left,event.pageY-$("#canvas").offset().top,
                    node.text,node.content,origin['type'],origin['committer'],origin['reason'],origin['conclusion']);

            }else if(node.node_type=='joint'){
                var origin = jointList[node.id];
                node_new = drawJoint(event.pageX-$("#canvas").offset().left,event.pageY-$("#canvas").offset().top,node.text,node.content,origin['type']);
            }

            nodes.push(node_new);
        }

        //添加操作至operationList
        operationList.push({'type':'copy','nodes':nodes});
    });

    //删除连线
    $('#delete-link-li').click(function () {
        $(this).parent().hide();

        scene.remove(nodeList_selected[0]);

        //添加操作至operationList
        operationList.push({'type':'delete','nodes':[nodeList_selected[0]]});
    });

    //删除箭头
    $('#delete-arrow-li').click(function () {
        $(this).parent().hide();

        deleteArrow(nodeList_selected[0]);

        //添加操作至operationList
        operationList.push({'type':'delete','nodes':[nodeList_selected[0]]});
    });

    //删除图元
    $('.delete-element-li').click(function () {
        $(this).parent().hide();

        var nodes = [];
        for(var i = 0;i<nodeList_selected.length;i++){
            var node = nodeList_selected[i];
            nodes.push(node);

            if(node.node_type=='header'){
               deleteHeader(node);

            }else if(node.node_type=='body'){
                deleteBody(node);

            }else if(node.node_type=='joint'){
                deleteJoint(node);

            }else if(node.node_type=='arrow'){
                deleteArrow(node);

            }else if(node.node_type=='link'){
                scene.remove(node);
            }
        }

        //添加操作至operationList
        operationList.push({'type':'delete','nodes':nodes});
    });
}

//右侧链体、链头、箭头、连接点button绑定
function bindRightPanel() {
    //链体
    $('#body-save-btn').click(function () {
        var bid = $('#body-panel').attr('data-bid');
        bodyList[bid]['node'].text = $('#body-name').val();
        bodyList[bid]['type'] = $('#body-evidenceType').val();
        bodyList[bid]['committer'] = $('#body-committer').val();
        bodyList[bid]['reason'] = $('#body-evidenceReason').val();
        bodyList[bid]['conclusion'] = $('#body-evidenceConclusion').val();
        var con = $('#body-content').val();
        bodyList[bid]['node'].content = con;

        var filter_content = '.evidence[data-id='+bid+']';
        var p_div = $(filter_content);

        if(p_div!=null&&p_div.length>0){
            if(con==null||con.length==0)
                con = $('#body-name').val();
            p_div.find('.evidence_a').html(con);
        }
    });

    $('#body-reset-btn').click(function () {
        var bid = $('#body-panel').attr('data-bid');
        $('#body-name').val(bodyList[bid]['node'].text);
        $('#body-evidenceType').val(bodyList[bid]['type']);
        $('#body-committer').val(bodyList[bid]['committer']);
        $('#body-evidenceReason').val(bodyList[bid]['reason']);
        $('#body-evidenceConclusion').val(bodyList[bid]['conclusion']);
        $('#body-content').val(bodyList[bid]['node'].content);
    });

    $('#body-del-btn').click(function () {
        var bid = $('#body-panel').attr('data-bid');
        if(bodyList[bid]!=null)
            deleteBody(bodyList[bid]['node']);
    });

    //链头
    $('#head-save-btn').click(function () {
        var hid = $('#head-panel').attr('data-hid');
        headerList[hid].text = $('#head-name').val();
        var con = $('#head-content').val();
        headerList[hid].content = con;

        var filter_content = '.head_chain[data-id='+hid+']';
        var p_div = $(filter_content);

        if(p_div!=null&&p_div.length>0){
            if(con==null||con.length==0)
                con = $('#head-name').val();
            p_div.html(con);
        }
    });

    $('#head-reset-btn').click(function () {
        var hid = $('#head-panel').attr('data-hid');
        $('#head-name').val(headerList[hid].text);
        $('#head-content').val(headerList[hid].content);
    });

    $('#head-del-btn').click(function () {
        var hid = $('#head-panel').attr('data-hid');
        if(headerList[hid]!=null)
            deleteHeader(headerList[hid]);
    });

    //箭头
    $('#arrow-save-btn').click(function () {
        var aid = $('#arrow-panel').attr('data-aid');
        arrowList[aid].text = $('#arrow-name').val();
        arrowList[aid].content = $('#arrow-content').val();
    });

    $('#arrow-reset-btn').click(function () {
        var aid = $('#arrow-panel').attr('data-aid');
        $('#arrow-name').val(arrowList[aid].text);
        $('#arrow-content').val(arrowList[aid].content);
    });

    $('#arrow-del-btn').click(function () {
        var aid = $('#arrow-panel').attr('data-aid');
        deleteArrow(arrowList[aid]);
    });

    //连接点
    $('#joint-save-btn').click(function () {
        var jid = $('#joint-panel').attr('data-jid');
        jointList[jid]['node'].text = $('#joint-name').val();
        jointList[jid]['type'] = $('#joint-type').val();
        jointList[jid]['node'].content = $('#joint-content').val();
    });

    $('#joint-reset-btn').click(function () {
        var jid = $('#joint-panel').attr('data-jid');
        $('#joint-name').val(jointList[jid]['node'].text);
        $('#joint-type').val(jointList[jid]['type']);
        $('#joint-content').val(jointList[jid]['node'].content);
    });

    $('#joint-del-btn').click(function () {
        var jid = $('#joint-panel').attr('data-jid');
        deleteJoint(jointList[jid]['node']);
    });
}

//添加连线
function addLink(nodeFrom,nodeTo){
    var hasLink = false;

    //判断是否已存在连线
    if(nodeFrom.outLinks!=null)
        for(var i = 0;i<nodeFrom.outLinks.length;i++){
            if(nodeFrom.outLinks[i].nodeZ==nodeTo){
                hasLink = true;
                break;
            }
        }

    if(!hasLink){
        var link = new JTopo.Link(nodeFrom, nodeTo);
        link.lineWidth = 3; // 线宽
        // link.dashedPattern = dashedPattern; // 虚线
        link.bundleOffset = 60; // 折线拐角处的长度
        link.bundleGap = 20; // 线条之间的间隔
        // link.textOffsetY = 3; // 文本偏移量（向下3个像素）
        link.strokeColor = '0,200,255';
        link.node_type = 'link';

        link.addEventListener('mouseup', function(event){
            handleNodeMenu(event,'link',this);
        });

        link.addEventListener('mouseout', function(){
            isNodeClicked_right = false;
            isNodeClicked_left = false;
        });

        scene.add(link);

        addHeaderofChain(nodeFrom.text,nodeFrom.id,nodeTo.id);

        return link;
    }

    return -1;
}

//添加箭头，返回箭头节点，未创建返回-1
function addArrow(nodeFrom,nodeTo,name,content) {

    var hasArrow = false;

    //判断是否已存在箭头
    if(nodeFrom.outLinks!=null)
        for(var i = 0;i<nodeFrom.outLinks.length;i++){
            if(nodeFrom.outLinks[i].nodeZ==nodeTo){
                hasArrow = true;
                break;
            }
        }

    if(!hasArrow){

        if(name==null)
             name = '新箭头'+(arrowIndex+1);

        var arrow = new JTopo.Link(nodeFrom, nodeTo, name);
        arrow.id = arrowIndex++;
        arrow.content = content;
        arrow.lineWidth = 3; // 线宽
        // arrow.dashedPattern = dashedPattern; // 虚线
        arrow.bundleOffset = 60; // 折线拐角处的长度
        arrow.bundleGap = 20; // 线条之间的间隔
        // arrow.textOffsetY = 3; // 文本偏移量（向下3个像素）
        arrow.strokeColor = '0,200,255';
        arrow.arrowsRadius = 10;
        arrow.node_type = 'arrow';

        arrowList[arrow.id] = arrow;
        scene.add(arrow);

        arrow.click(function () {
            $('#body-panel').attr('hidden', 'hidden');
            $('#head-panel').attr('hidden', 'hidden');
            $('#joint-panel').attr('hidden', 'hidden');

            $('#arrow-name').val(arrow.text);
            $('#arrow-content').val(arrow.content);
            $('#arrow-panel').removeAttr("hidden");
            $('#arrow-panel').attr('data-aid',arrow.id);
        });

        arrow.addEventListener('mouseup', function(event){
            handleNodeMenu(event,'arrow',this);
        });

        arrow.addEventListener('mouseout', function(event){
            isNodeClicked_right = false;
            isNodeClicked_left = false;
        });

        return arrow;
    }

    return -1;
}

//删除箭头
function deleteArrow(arrow) {
    arrowList[arrow.id] = null;
    scene.remove(arrow);
    $('#arrow-panel').attr('hidden', 'hidden');
}

//绘制链头，返回链头节点
function drawHeader(x,y,name,content){

    if(name==null)
        name = '新链头'+(headerIndex+1);
    if(content==null)
        content = name;

    var circleNode = new JTopo.CircleNode(name);
    circleNode.id = headerIndex++;
    circleNode.content = content;
    circleNode.radius = header_radius; // 半径
    // circleNode.alpha = 0.7;
    // circleNode.fillColor = '0, 0, 150'; // 填充颜色
    // circleNode.borderColor = "";
    circleNode.setLocation(x-header_radius, y-header_radius);
    circleNode.textPosition = 'Bottom_Center'; // 文本位置
    circleNode.node_type = 'header';
    
    headerList[circleNode.id] = circleNode;
    scene.add(circleNode);

    circleNode.click(function () {
        $('#body-panel').attr('hidden', 'hidden');
        $('#arrow-panel').attr('hidden', 'hidden');
        $('#joint-panel').attr('hidden', 'hidden');

        $('#head-name').val(circleNode.text);
        $('#head-content').val(circleNode.content);
        $('#head-panel').removeAttr("hidden");
        $('#head-panel').attr('data-hid',circleNode.id);

        highlightEvidence();
    });

    circleNode.addEventListener('mouseup', function(event){
        handleNodeMenu(event,'header',this);
    });
    circleNode.addEventListener('mousedown', function(event){
        // console.log(this.x+"&&"+this.y);
        x_origin = this.x;
        y_origin = this.y;
        sourceNode = this;
    });

    circleNode.addEventListener('mouseout', function(event){
        isNodeClicked_right = false;
        isNodeClicked_left = false;
    });

    return circleNode;
}

//删除链头
function deleteHeader(header) {
    headerList[header.id] = null;
    scene.remove(header);
    $('#head-panel').attr('hidden', 'hidden');

    var filter_content = '.head_chain[data-id='+header.id+']';
    var p_div = $(filter_content);

    if(p_div!=null&&p_div.length>0){
        p_div.remove();
    }
}

//绘制链体，返回链体节点
function drawBody(x,y,name,content,type,committer,reason,conclusion){

    if(name==null)
        name = '新链体'+(bodyIndex+1);

    var node = new JTopo.Node(name);
    node.id = bodyIndex++;
    node.content = content;
    // node.alpha = 0.7;
    node.setSize(body_width,body_height);
    node.setLocation(x-(body_width/2),y-(body_height/2));
    node.shadow = "true";
    node.textPosition = 'Bottom_Center'; // 文本位置
    node.node_type = 'body';

    bodyList[node.id] = {'node':node,'type':type,'committer':committer,'reason':reason,'conclusion':conclusion};
    scene.add(node);

    node.click(function () {
        $('#head-panel').attr('hidden', 'hidden');
        $('#arrow-panel').attr('hidden', 'hidden');
        $('#joint-panel').attr('hidden', 'hidden');

        var bid = node.id;
        $('#body-name').val(node.text);
        $('#body-evidenceType').val(bodyList[bid]['type']);
        $('#body-committer').val(bodyList[bid]['committer']);
        $('#body-evidenceReason').val(bodyList[bid]['reason']);
        $('#body-evidenceConclusion').val(bodyList[bid]['conclusion']);
        $('#body-content').val(bodyList[bid]['node'].content);
        $('#body-panel').removeAttr("hidden");
        $('#body-panel').attr('data-bid',node.id);

        highlightEvidence();
    });
    node.addEventListener('mouseup', function(event){
        handleNodeMenu(event,'body',this);
    });
    node.addEventListener('mousedown', function(event){
        console.log(this.x+";"+this.y);
        x_origin = this.x;
        y_origin = this.y;
        sourceNode = this;
    });

    node.addEventListener('mouseout', function(event){
        isNodeClicked_right = false;
        isNodeClicked_left = false;
    });

    if(content==null)
        content = name;
    addEvidence(node.id,content);

    return node;
}

//删除链体
function deleteBody(body) {
    bodyList[body.id] = null;
    scene.remove(body);
    $('#body-panel').attr('hidden', 'hidden');

    var filter_content = '.evidence[data-id='+body.id+']';
    var p_div = $(filter_content);

    if(p_div!=null&&p_div.length>0){
        p_div.remove();
    }
}

//绘制连接点，返回连接点节点
function drawJoint(x,y,name,content,type){

    if(name==null)
        name = '新连接点'+(jointIndex+1);

    var node = new JTopo.Node(name);
    node.id = jointIndex++;
    node.content = content;
    node.setSize(joint_width,joint_width);
    node.setLocation(x-(joint_width/2),y-(joint_width/2));
    node.shadow = "true";
    node.node_type = 'joint';

    jointList[node.id] = {'node':node,'type':type};
    scene.add(node);

    node.click(function () {
        $('#head-panel').attr('hidden', 'hidden');
        $('#arrow-panel').attr('hidden', 'hidden');
        $('#body-panel').attr('hidden', 'hidden');

        $('#joint-name').val(node.text);
        $('#joint-type').val(jointList[node.id]['type']);
        $('#joint-content').val(node.content);
        $('#joint-panel').removeAttr("hidden");
        $('#joint-panel').attr('data-jid',node.id);
    });

    node.addEventListener('mouseup', function(event){
        handleNodeMenu(event,'joint',this);
    });
    node.addEventListener('mousedown', function(event){
        console.log(this.x+"**"+this.y);
        x_origin = this.x;
        y_origin = this.y;
        sourceNode = this;
    });
    node.addEventListener('mouseout', function(event){
        isNodeClicked_right = false;
        isNodeClicked_left = false;
    });

    return node;
}

//删除连接点
function deleteJoint(joint) {
    jointList[joint.id] = null;
    scene.remove(joint);
    $('#joint-panel').attr('hidden', 'hidden');
}

//点击图元左侧列表相应证据高亮
function highlightEvidence() {
    $('.evidence').css('background-color', 'white');
    $('.evidence_plaintiff').css('background-color', '#5ed7e5');

    if(nodeList_selected.length>=1){

        for(var i = 0;i<nodeList_selected.length;i++){

            if(nodeList_selected[i].node_type=='header'){
                if(nodeList_selected[i].outLinks!= null){
                    var hid = nodeList_selected[i].id;
                    var filter_content = '.head_chain[data-id='+hid+']';
                    var e_div = $(filter_content);

                    e_div.css('background-color', 'yellow');
                }
            }

            if(nodeList_selected[i].node_type=='body'){
                var bid = nodeList_selected[i].id;
                var filter_content = '.evidence[data-id='+bid+']';
                var e_div = $(filter_content);

                e_div.css('background-color', 'yellow');
                e_div.find('.head_chain').css('background-color', 'yellow');
            }
        }
    }
}

//初始化右侧建模图
function initGraph(data) {

    var x = 35;
    var y = 35;

    for(var i = 0;i<data.length;i++){
        var bid = drawBody(x+100,y,'证据'+(i+1),data[i]['证据'],"XX","XXX","XXX","XXXX").id;

        var headers = data[i]['链头'];
        for(var j = 0;j<headers.length;j++){
            var hid = drawHeader(x,y,headers[j],headers[j]).id;
            y+=70;
            addLink(headerList[hid], bodyList[bid]['node']);
        }
        x+=100;

    }

    // JTopo.layout.layoutNode(scene, bodyList['证据0'], true);
}

//排版
function typeSetting() {
    var x = 10 + (body_width/2);
    var y = 10 + header_radius;
    var headerGap_x = 100;
    var headerGap_y = 40;
    var jointGap = 150;

    for(var bid in bodyList){
        var body = bodyList[bid]['node'];
        body.x = x;

        var inLinks = body.inLinks;
        body.y = y+((inLinks.length-1)*(2*header_radius + headerGap_y)/2);

        for(var i = 0;i<inLinks.length;i++){
            var header = inLinks[i].nodeA;
            header.x = x + body_width/2 + headerGap_x + header_radius;
            header.y = y;
            y += headerGap_y + (header_radius*2);
        }
    }

    x+=body_width/2 + headerGap_x + header_radius;
    for(var jid in jointList){
        var joint = jointList[jid]['node'];
        joint.x = x + header_radius + jointGap + joint_width/2;
        var y_max = 0;
        var y_min = 10000000;
        var inLinks = joint.inLinks;

        for(var i = 0;i<inLinks.length;i++){
            var header = inLinks[i].nodeA;
            if(header.y>y_max){
                y_max = header.y;
            }
            if(header.y<y_min){
                y_min = header.y;
            }
        }
        joint.y = (y_min + y_max)/2;
    }
}