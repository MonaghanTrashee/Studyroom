// PascalCasing
function Message() {
    const name = "Trashee";
    if (name) {
        return <div><h1>Hello {name}</h1></div>;
    }
    return <div><h1>Hello user :D </h1></div>;
}

export default Message;