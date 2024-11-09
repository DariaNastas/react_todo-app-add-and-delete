import React, { useEffect, useState, useRef } from 'react';
import { addTodo, getTodos, USER_ID } from './api/todos';
import { Todo } from './types/Todo';
import cn from 'classnames';
import { Footer as TodoFooter } from './components/Footer';
import { Filter } from './types/Filter';
import { errorMessages, ErrorMessages } from './types/ErrorMessages';

type TempTodo = Todo & { tempLoading?: boolean };

export const App: React.FC = () => {
  const [todos, setTodos] = useState<TempTodo[]>([]);
  const [filter, setFilter] = useState<Filter>(Filter.all);
  const [error, setError] = useState<ErrorMessages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoaderActive, setIsLoaderActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus on the input field by default
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    getTodos()
      .then(data => setTodos(data))
      .catch(() => setError(errorMessages.load))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    let timerId = 0;

    if (error) {
      timerId = window.setTimeout(() => setError(null), 3000);
    }

    return () => clearTimeout(timerId);
  }, [error]);

  const handleFormSubmit = (event: React.FormEvent) => {
    // Винесений preventDefault для зручності
    event.preventDefault();

    const newTodoTitle = inputRef.current?.value.trim();

    if (!newTodoTitle) {
      setError(errorMessages.title);

      return;
    }

    // Створення нового тимчасового об'єкта todo
    const newTodo: TempTodo & { tempLoading: boolean } = {
      id: Date.now(),
      title: newTodoTitle,
      completed: false,
      userId: USER_ID,
      tempLoading: true,
    };

    // Додавання нового завдання до списку з тимчасовим статусом
    setTodos(prevTodos => [...prevTodos, newTodo]);
    setIsSubmitting(true);
    setIsLoaderActive(true);

    // Додавання класу активного лоадера
    const loaderElement = document.querySelector('.modal.overlay');

    if (loaderElement) {
      loaderElement.classList.add('is-active');
    }

    // Відправка запиту на додавання нового завдання
    addTodo(newTodo)
      .then(() => {
        setTodos(prevTodos =>
          prevTodos.map(todo =>
            todo.id === newTodo.id ? { ...todo, tempLoading: false } : todo,
          ),
        );
      })
      .catch(() => setError(errorMessages.add))
      .finally(() => {
        setIsSubmitting(false);
        if (inputRef.current) {
          inputRef.current.value = '';
        }

        // Вимкнення лоадера після завершення запиту
        if (loaderElement) {
          loaderElement.classList.remove('is-active');
        }

        setIsLoaderActive(false);
      });
  };

  const handleHideError = () => {
    setError(null);
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === Filter.active) {
      return !todo.completed;
    }

    if (filter === Filter.completed) {
      return todo.completed;
    }

    return true;
  });

  const allTodosCompleted =
    todos.length > 0 && todos.every(todo => todo.completed);

  const handleClearCompleted = () => {
    setTodos(prevTodos => prevTodos.filter(todo => !todo.completed));
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className={cn('todoapp__toggle-all', { active: allTodosCompleted })}
            data-cy="ToggleAllButton"
            onClick={() => {
              const completedStatus = !allTodosCompleted;

              setTodos(prevTodos =>
                prevTodos.map(todo => ({
                  ...todo,
                  completed: completedStatus,
                })),
              );
            }}
          />

          <form onSubmit={handleFormSubmit}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              ref={inputRef}
              disabled={isSubmitting}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {isLoading || isLoaderActive ? (
            <div data-cy="TodoLoader" className="modal overlay is-active">
              <div className="modal-background has-background-white-ter" />
              <div className="loader" />
            </div>
          ) : (
            filteredTodos.map(todo => (
              <div
                data-cy="Todo"
                className={cn('todo', { completed: todo.completed })}
                key={todo.id}
              >
                {todo.tempLoading && (
                  <div className="modal overlay is-active">
                    <div
                      className="
                    modal-background 
                    has-background-white-ter"
                    />
                    <div className="loader" />
                  </div>
                )}
                <label
                  className="todo__status-label"
                  htmlFor={`todo-checkbox-${todo.id}`}
                >
                  Toggle completed
                  <input
                    id={`todo-checkbox-${todo.id}`}
                    data-cy="TodoStatus"
                    type="checkbox"
                    className="todo__status"
                    checked={todo.completed}
                    onChange={() =>
                      setTodos(prevTodos =>
                        prevTodos.map(item =>
                          item.id === todo.id
                            ? { ...item, completed: !item.completed }
                            : item,
                        ),
                      )
                    }
                  />
                </label>

                <span data-cy="TodoTitle" className="todo__title">
                  {todo.title}
                </span>

                <button
                  type="button"
                  className="todo__remove"
                  data-cy="TodoDelete"
                  onClick={() =>
                    setTodos(prevTodos =>
                      prevTodos.filter(item => item.id !== todo.id),
                    )
                  }
                >
                  ×
                </button>

                <div data-cy="TodoLoader" className="modal overlay">
                  <div className="modal-background has-background-white-ter" />
                  <div className="loader" />
                </div>
              </div>
            ))
          )}
        </section>

        {todos.length > 0 && (
          <TodoFooter
            setFilter={setFilter}
            remainingCount={todos.filter(todo => !todo.completed).length}
            currentFilter={filter}
            handleClearCompleted={handleClearCompleted}
          />
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={cn(
          'notification',
          'is-danger',
          'is-light',
          'has-text-weight-normal',
          { hidden: !error },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={handleHideError}
        />
        {error}
      </div>
    </div>
  );
};
